// Explicit local test-server preload. Never imported by app code or deployment.
// NODE_OPTIONS=--import=./scripts/tests/mock-supabase.mjs npm run preview -- 4175
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { createHash,scryptSync } from 'node:crypto';
const origin='http://localhost:4175';
process.env.ADMIN_ORIGIN=origin;
process.env.ADMIN_EMAIL='reviewer@example.test';
const salt='f'.repeat(32);
process.env.ADMIN_PASSWORD_HASH='scrypt:'+salt+':'+scryptSync('local fixture password',salt,64,{N:32768,r:8,p:1,maxmem:67108864}).toString('hex');
process.env.ADMIN_RATE_SECRET='local-fixture-rate-secret-do-not-use-in-production';
process.env.SUPABASE_URL='https://admin-fixture.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-key';
const fixtureFile=process.env.ADMIN_FIXTURE_VIDEO||'/tmp/juggledude-admin-fixture.mp4';
const video=readFileSync(fixtureFile),digest=createHash('sha256').update(video).digest('hex');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema private; create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid'; create table auth.users(id uuid primary key,email text,last_sign_in_at timestamptz);
create table profiles(id uuid primary key,display_name text,deletion_requested_at timestamptz);
create table juggling_sessions(user_id uuid,id uuid,touch_count integer,streak_touches integer,streak_start_ms integer,streak_end_ms integer,primary key(user_id,id));
create table leaderboard_attempts(id uuid primary key,user_id uuid,session_id uuid,status text,submitted_at timestamptz,created_at timestamptz default now(),
proposed_count integer,proposed_start_ms integer,proposed_end_ms integer,duration_ms integer,video_sha256 text,video_bytes bigint,object_path text,touch_review jsonb,
video_deleted_at timestamptz,video_delete_requested_at timestamptz,reviewed_at timestamptz,reviewed_count integer,reviewed_start_ms integer,reviewed_end_ms integer,review_reason text,reason_time_ms integer,appeal_text text);
create table private.leaderboard_reviews(attempt_id uuid,reviewer text,decision text,count integer,start_ms integer,end_ms integer,reason text,reason_time_ms integer);`);
// Exercise the real existing review RPC, not a JavaScript substitute.
const existing=readFileSync(new URL('../../../kicklab/supabase/migrations/202610180001_reviewed_leaderboard.sql',import.meta.url),'utf8');
const from=existing.indexOf('create function public.review_leaderboard_attempt('),through=existing.indexOf('-- Claim under row locks',from);
await db.exec(existing.slice(from,through));
await db.exec(readFileSync(new URL('../../supabase/migrations/202610230002_admin_review_panel.sql',import.meta.url),'utf8'));
const user='20000000-0000-4000-8000-000000000001',session='30000000-0000-4000-8000-000000000001',id='10000000-0000-4000-8000-000000000001';
await db.query('insert into profiles values($1,$2,null)',[user,'Demo Player']);
await db.query('insert into juggling_sessions values($1,$2,30,23,1000,15000)',[user,session]);
const report={version:1,durationMS:20000,complete:true,moments:[{kind:'handsUncertain',timeMS:2000,lastTimeMS:2000,clipStartMS:1000,clipEndMS:3200},{kind:'groundContact',timeMS:9000,lastTimeMS:9000,clipStartMS:8000,clipEndMS:10200}]};
await db.query(`insert into leaderboard_attempts(id,user_id,session_id,status,submitted_at,proposed_count,proposed_start_ms,proposed_end_ms,duration_ms,video_sha256,video_bytes,object_path,touch_review) values($1,$2,$3,'pending',now(),25,1000,15000,20000,$4,$5,$6,$7)`,[id,user,session,digest,video.length,user+'/fixture.mp4',JSON.stringify(report)]);
// Analytics fixture data stays in this isolated process; never seed production.
await db.exec(`alter table profiles add column country_code text default 'DE', add column created_at timestamptz default now(), add column leaderboard_visible boolean default false, add column avatar_path text;
alter table juggling_sessions add column duration_ms integer default 20000, add column source text default 'recording',
 add column completed_at timestamptz default now(), add column received_at timestamptz default now(), add column app_version text default '1.2.0', add column counter_version text default 'counter-test', add column score_status text default 'device_reported';
create table private.apple_subscriptions(environment text, original_transaction_id text, user_id uuid, product_id text, status integer,
 access_until_ms bigint, updated_at timestamptz default now());`);
await db.exec(readFileSync(new URL('../../supabase/migrations/202611010001_admin_analytics.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../supabase/migrations/202611020001_admin_analytics_details.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../../kicklab/supabase/migrations/202610260001_automatic_leaderboard_beta.sql',import.meta.url),'utf8'));
await db.query('update profiles set leaderboard_visible=true where id=$1',[user]);
const names=['Alex Rivera','Jamie Parker','Sam Keller','Taylor Morgan','Morgan Lee','Robin Fischer','Charlie Rossi','Jordan Silva'];
for(let i=0;i<names.length;i++){
 const playerID='50000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
 await db.query(`insert into profiles(id,display_name,country_code,created_at,leaderboard_visible) values($1,$2,$3,now()-($4::int*interval '1 day'),$5)`,[playerID,names[i],['DE','GB','FR','DE','US',null,'IT','BR'][i],i,i<5]);
 await db.query('insert into auth.users values($1,$2,now())',[playerID,names[i].toLowerCase().replace(' ','.')+'@example.test']);
 for(let n=0;n<32-i;n++) await db.query(`insert into juggling_sessions(user_id,id,touch_count,duration_ms,source,completed_at,app_version)
 values($1,$2,$3,$4,$5,now()-($6::int*interval '1 day')-($7::int*interval '10 minutes'),$8)`,
 [playerID,'60000000-0000-4000-8000-'+String((i+1)*100+n).padStart(12,'0'),20+n*7+i,18000+n*1000,n%3===0?'gallery':'recording',(n+i)%12,n,i%3===0?'1.1.0':'1.2.0']);
 if(i<3)await db.query(`insert into private.apple_subscriptions values('Production',$1,$2,$3,$4,extract(epoch from now()+interval '10 days')*1000,now())`,
 [String(i+1),playerID,i===1?'com.hewad.juggledude.pro.monthly':'com.hewad.juggledude.pro.yearly',i===2?4:1]);
}
await db.exec(`update juggling_sessions set streak_touches=greatest(1,touch_count-3),streak_start_ms=0,streak_end_ms=duration_ms where streak_touches is null;
insert into profiles(id,display_name,leaderboard_visible) values('50000000-0000-4000-8000-000000000099','Joined, waiting',true);`);
const original=globalThis.fetch;
globalThis.fetch=async(input,init={})=>{
 const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(u.origin!=='https://admin-fixture.supabase.co')return original(input,init);
 try {
  if(u.pathname.startsWith('/storage/')){
   const range=new Headers(init.headers).get('range'),match=range?.match(/^bytes=(\d+)-(\d*)$/);
   const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),video.length-1):video.length-1;
   return new Response(video.subarray(start,end+1),{status:match?206:200,headers:{'Content-Type':'video/mp4','Content-Length':String(end-start+1),'Accept-Ranges':'bytes',...(match?{'Content-Range':`bytes ${start}-${end}/${video.length}`}:{})}});
  }
  if(u.pathname.startsWith('/rest/v1/rpc/')){
   const name=u.pathname.split('/').at(-1),body=JSON.parse(init.body);
   if(!['admin_analytics','admin_analytics_player','reviewed_juggling_leaderboard'].includes(name)&&!/^admin_review_[a-z_]+$/.test(name))throw new Error('Unexpected fixture RPC');
   if(process.env.ADMIN_FIXTURE_DELAY_MS && (name.startsWith('admin_analytics')||name==='reviewed_juggling_leaderboard')) await new Promise(resolve=>setTimeout(resolve,Number(process.env.ADMIN_FIXTURE_DELAY_MS)));
   const entries=Object.entries(body),args=entries.map(([k],i)=>`${k} => $${i+1}`).join(',');
   const result=await db.query(`select public.${name}(${args}) as result`,entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v));
   return Response.json(result.rows[0].result);
  }
  const table=u.pathname.split('/').at(-1);
  if(!['profiles','juggling_sessions','leaderboard_attempts'].includes(table))throw new Error('Unexpected fixture table');
  const fields=[],values=[];
  for(const k of ['id','user_id']){const v=u.searchParams.get(k);if(v){
   if(v.startsWith('in.(')){values.push(v.slice(4,-1).split(','));fields.push(`${k}=any($${values.length}::uuid[])`);}
   else{values.push(v.replace(/^eq\./,''));fields.push(`${k}=$${values.length}`);}
  }}
  if(u.searchParams.get('deletion_requested_at')==='is.null')fields.push('deletion_requested_at is null');
  if(u.searchParams.get('leaderboard_visible')==='eq.true')fields.push('leaderboard_visible=true');
  const where=fields.length?' where '+fields.join(' and '):'';
  if(init.method==='HEAD'){
   const count=(await db.query(`select count(*) as n from public.${table}${where}`,values)).rows[0].n;
   return new Response(null,{headers:{'content-range':`*/${count}`}});
  }
  const result=await db.query(`select * from public.${table}${where}`,values);
  const select=u.searchParams.get('select');
  return Response.json(select&&select!=='*'?result.rows.map(row=>Object.fromEntries(select.split(',').map(key=>[key,row[key]]))):result.rows);
 }catch(error){return Response.json({code:error.code||'FIXTURE_ERROR'},{status:error.code==='23505'?409:400});}
};
console.log('Isolated admin fixture ready. No production requests or data writes.');
