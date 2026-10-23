import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionHash, safeOrigin } from './security';
import { idSchema } from './validation';
import type { Attempt } from './types';
export class AdminError extends Error { constructor(public status: number,message: string) { super(message); } }
export const cookieName = process.env.NODE_ENV==='production' ? '__Host-jd_admin' : 'jd_admin_dev';
export const cookieOptions = { httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:4*60*60 };
export function config() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY, email=process.env.ADMIN_EMAIL,
    password=process.env.ADMIN_PASSWORD_HASH, secret=process.env.ADMIN_RATE_SECRET, origin=process.env.ADMIN_ORIGIN;
  if(!url||!key||!email||!password||!secret||secret.length<32||!origin) throw new AdminError(503,'Admin is not configured. Contact the operator.');
  const u=new URL(url);
  if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/') throw new AdminError(503,'Admin configuration is invalid.');
  return {url:u.origin,key,email,password,secret,origin};
}
export async function supabase(path: string, init: RequestInit={}) {
  const {url,key}=config();
  const response=await fetch(url+path,{...init,cache:'no-store',redirect:'error',signal:init.signal??AbortSignal.timeout(20000),headers:{'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json',...init.headers}});
  if(!response.ok) {
    // Never pass database messages, credentials, signed URLs or user data to logs/errors.
    let code=''; try {code=(await response.json()).code||'';} catch {}
    if(code==='22023') throw new AdminError(422,'The review could not be validated. Recheck the decisions, score and video verification.');
    if(code==='42501') throw new AdminError(403,'This action is not allowed. Sign in again.');
    if(response.status===409) throw new AdminError(409,'This request changed. Refresh it before saving.');
    throw new AdminError(502,'The review service could not complete this request. Refresh and retry.');
  }
  return response;
}
export async function rpc<T>(name: string,body: Record<string,unknown>): Promise<T> {
  const response=await supabase(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
  return response.status===204 ? null as T : response.json();
}
export async function requireSession() {
  const value=(await cookies()).get(cookieName)?.value;
  if(!value||!/^[a-f0-9]{64}$/.test(value)) throw new AdminError(401,'Sign in to continue.');
  const hash=sessionHash(value);
  if(!await rpc<boolean>('admin_review_session_valid',{p_token:hash})) throw new AdminError(401,'Your session expired. Sign in again.');
  return hash;
}
export function validateMutation(request: Request) {
  if(!safeOrigin(request,config().origin)) throw new AdminError(403,'Request origin is not allowed.');
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json') throw new AdminError(415,'Send a JSON request.');
}
export async function readJSON(request: Request,limit=524288) {
  if(Number(request.headers.get('content-length')||0)>limit) throw new AdminError(413,'Request is too large.');
  const reader=request.body?.getReader(); if(!reader) throw new AdminError(400,'A request body is required.');
  const chunks:Uint8Array[]=[]; let size=0;
  try { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>limit) { await reader.cancel(); throw new AdminError(413,'Request is too large.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AdminError(400,'Invalid JSON.'); }
}
export function json(data: unknown,status=200) { return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}}); }
export function failure(error: unknown) {
  if(error instanceof AdminError) return json({error:error.message},error.status);
  return json({error:'The request could not be completed. Please retry.'},500);
}
export type StoredAttempt=Attempt&{object_path:string;video_sha256:string;video_bytes:number};
export async function attempt(id: string): Promise<StoredAttempt> {
  if(!idSchema.safeParse(id).success) throw new AdminError(400,'Invalid request ID.');
  const rows=await (await supabase(`/rest/v1/leaderboard_attempts?id=eq.${id}&select=*`)).json();
  const a=rows[0] as StoredAttempt|undefined;
  if(!a) throw new AdminError(404,'Review request not found.');
  return a;
}
export function available(a: StoredAttempt) {
  if(a.video_delete_requested_at||a.video_deleted_at||['uploading','withdrawn'].includes(a.status)) throw new AdminError(410,'This review video is no longer available.');
  if(!/^[a-f0-9]{64}$/.test(a.video_sha256)||!Number.isSafeInteger(a.video_bytes)||a.video_bytes<1||a.video_bytes>2147483648) throw new AdminError(422,'Invalid video evidence.');
  if(!a.object_path.startsWith(a.user_id+'/')||a.object_path.split('/').some(s=>!s||s==='.'||s==='..')) throw new AdminError(422,'Invalid video location.');
}
export const videoPath=(a:StoredAttempt)=>'/storage/v1/object/authenticated/leaderboard-originals/'+a.object_path.split('/').map(encodeURIComponent).join('/');
