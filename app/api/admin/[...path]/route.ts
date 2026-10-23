import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { AdminError, attempt, available, config, cookieName, cookieOptions, failure, json, readJSON, requireSession, rpc, supabase, validateMutation, videoPath } from '@/lib/admin/server';
import { newToken, passwordMatches, privateKey, sessionHash } from '@/lib/admin/security';
import { finishSchema, idSchema, loginSchema } from '@/lib/admin/validation';
import type { Queue, ReviewDetail } from '@/lib/admin/types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
type Context={params:Promise<{path:string[]}>};

export async function GET(request:Request,context:Context) {
 try {
  const token=await requireSession();
  const {path}=await context.params;
  if(path.join('/')==='session') return json({email:config().email});
  if(path.join('/')==='queue') {
   const url=new URL(request.url),status=url.searchParams.get('status')||'pending', offset=Number(url.searchParams.get('offset')||0);
   if(!['pending','approved','rejected'].includes(status)||!Number.isInteger(offset)||offset<0||offset>100000) throw new AdminError(400,'Invalid queue filter.');
   return json(await rpc<Queue>('admin_review_queue',{p_token:token,p_status:status,p_offset:offset}));
  }
  if(path[0]==='attempts'&&idSchema.safeParse(path[1]).success) {
   const a=await attempt(path[1]);
   if(path.length===3&&path[2]==='video') {
    available(a);
    const range=request.headers.get('range');
    if(range&&!/^bytes=\d+-\d*$/.test(range)) throw new AdminError(416,'Invalid video range.');
    const response=await supabase(videoPath(a),{headers:range?{Range:range}:{},signal:AbortSignal.timeout(240000)});
    const headers=new Headers({'Content-Type':response.headers.get('content-type')==='video/quicktime'?'video/quicktime':'video/mp4',
      'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Accept-Ranges':'bytes'});
    for(const name of ['content-length','content-range']) { const v=response.headers.get(name); if(v) headers.set(name,v); }
    return new Response(response.body,{status:response.status,headers});
   }
   if(path.length===2) {
    const [profiles,sessions,previous]=await Promise.all([
     supabase(`/rest/v1/profiles?id=eq.${a.user_id}&select=display_name,deletion_requested_at`).then(r=>r.json()),
     supabase(`/rest/v1/juggling_sessions?user_id=eq.${a.user_id}&id=eq.${a.session_id}&select=*`).then(r=>r.json()),
     rpc<ReviewDetail['previous']>('admin_review_previous',{p_token:token,p_id:a.id}),
    ]);
    if(!profiles[0]||profiles[0].deletion_requested_at) throw new AdminError(410,'This account is no longer available.');
    const {object_path,video_sha256,video_bytes,...safe}=a;
    void object_path; void video_sha256; void video_bytes;
    return json({attempt:{...safe,player_name:profiles[0].display_name,device_count:sessions[0]?.streak_touches??null,
     device_start_ms:sessions[0]?.streak_start_ms??null,device_end_ms:sessions[0]?.streak_end_ms??null},previous});
   }
  }
  throw new AdminError(404,'Route not found.');
 } catch(error) { return failure(error); }
}
export async function POST(request:Request,context:Context) {
 try {
  validateMutation(request);
  const {path}=await context.params;
  if(path.join('/')==='login') {
   const data=loginSchema.safeParse(await readJSON(request,2048));
   if(!data.success) throw new AdminError(400,'Enter a valid email and password.');
   const cfg=config();
   const ip=process.env.VERCEL==='1' ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown') : 'local';
   const allowed=await rpc<boolean>('admin_review_login_allowed',{p_ip:privateKey(`ip:${ip}`,cfg.secret),p_global:privateKey('global',cfg.secret)});
   if(!allowed) { const response=json({error:'Too many sign-in attempts. Try again in 15 minutes.'},429); response.headers.set('Retry-After','900'); return response; }
   const emailOK=timingSafeEqual(Buffer.from(privateKey(data.data.email.trim().toLowerCase(),cfg.secret)),Buffer.from(privateKey(cfg.email,cfg.secret)));
   const passwordOK=passwordMatches(data.data.password,cfg.password);
   if(!emailOK||!passwordOK) throw new AdminError(401,'Email or password is incorrect.');
   const raw=newToken();
   await rpc('admin_review_create_session',{p_token:sessionHash(raw),p_reviewer:cfg.email});
   (await cookies()).set(cookieName,raw,cookieOptions);
   return json({email:cfg.email});
  }
  const token=await requireSession();
  if(path.join('/')==='logout') {
   await rpc('admin_review_logout',{p_token:token});
   (await cookies()).set(cookieName,'',{...cookieOptions,maxAge:0});
   return json({ok:true});
  }
  if(path[0]==='attempts'&&path.length===3&&idSchema.safeParse(path[1]).success) {
   const a=await attempt(path[1]); available(a);
   if(path[2]==='verify') {
    await readJSON(request,64);
    const response=await supabase(videoPath(a),{signal:AbortSignal.timeout(240000)});
    if(response.status!==200||!response.body) throw new AdminError(422,'Video could not be verified.');
    const reader=response.body.getReader(),hash=createHash('sha256'); let bytes=0;
    try {
     while(true) {
      const {done,value}=await reader.read(); if(done) break;
      bytes+=value.byteLength;
      if(bytes>a.video_bytes) { await reader.cancel(); throw new AdminError(422,'Video size does not match the submission.'); }
      hash.update(value);
     }
    } finally { reader.releaseLock(); }
    const digest=hash.digest('hex');
    if(bytes!==a.video_bytes||digest!==a.video_sha256) throw new AdminError(422,'Video integrity check failed. Do not approve this request.');
    await rpc('admin_review_verify_evidence',{p_token:token,p_id:a.id,p_sha256:digest});
    return json({verified:true,bytes});
   }
   if(path[2]==='finish') {
    const parsed=finishSchema.safeParse(await readJSON(request));
    if(!parsed.success) throw new AdminError(400,'Decide every moment and enter a valid review summary and score.');
    const v=parsed.data;
    return json(await rpc('admin_review_finish',{p_token:token,p_id:a.id,p_request:v.requestId,p_choices:v.choices,
     p_count:v.count,p_start_ms:v.startMS,p_end_ms:v.endMS,p_reason:v.reason}));
   }
  }
  throw new AdminError(404,'Route not found.');
 } catch(error) { return failure(error); }
}
