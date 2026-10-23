import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scryptSync } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { clipWindows, momentClip, momentID } from '../../lib/admin/types';
import type { Attempt } from '../../lib/admin/types';
import { passwordMatches, safeOrigin, sessionHash } from '../../lib/admin/security';
import { finishSchema, loginSchema } from '../../lib/admin/validation';
const id='10000000-0000-4000-8000-000000000001', user='20000000-0000-4000-8000-000000000001', session='30000000-0000-4000-8000-000000000001';
const token='a'.repeat(64), sha='b'.repeat(64), request='40000000-0000-4000-8000-000000000001';
const moments=[{kind:'handsUncertain',timeMS:2000,lastTimeMS:2000,clipStartMS:1000,clipEndMS:3200},{kind:'groundContact',timeMS:9000,lastTimeMS:9000,clipStartMS:8000,clipEndMS:10200}] as const;
const choices=moments.map(m=>({id:momentID(m),decision:'confirm' as const}));
const fixture={id,user_id:user,session_id:session,duration_ms:20000,proposed_count:25,proposed_start_ms:1000,proposed_end_ms:15000,touch_review:{version:1,durationMS:20000,complete:true,moments:[...moments]}} as Attempt;
const migration=readFileSync(new URL('../../supabase/migrations/202610230002_admin_review_panel.sql',import.meta.url),'utf8');
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema private;
 create table public.profiles(id uuid primary key,display_name text,deletion_requested_at timestamptz);
 create table public.juggling_sessions(user_id uuid,id uuid,touch_count integer,primary key(user_id,id));
 create table public.leaderboard_attempts(id uuid primary key,user_id uuid,session_id uuid,status text,submitted_at timestamptz,
 proposed_count integer,proposed_start_ms integer,proposed_end_ms integer,duration_ms integer,
 video_sha256 text,object_path text,video_bytes bigint,touch_review jsonb,video_delete_requested_at timestamptz,video_deleted_at timestamptz,
 reviewed_count integer,reviewed_at timestamptz);
 create table private.leaderboard_reviews(attempt_id uuid,decision text,count integer);
 create function public.review_leaderboard_attempt(p_id uuid,p_approved boolean,p_count integer,p_start_ms integer,p_end_ms integer,p_reason text,p_reason_time_ms integer,p_sha256 text,p_reviewer text) returns void language plpgsql as $$begin
 update public.leaderboard_attempts set status=case when p_approved then 'approved' else 'rejected' end,reviewed_count=p_count,reviewed_at=now() where id=p_id;
 insert into private.leaderboard_reviews values(p_id,case when p_approved then 'approved' else 'rejected' end,p_count); end$$;`);
 await db.exec(migration);
 await db.query('insert into profiles values($1,$2,null)',[user,'Test Player']);
 await db.query('insert into juggling_sessions values($1,$2,30)',[user,session]);
 await db.query(`insert into leaderboard_attempts(id,user_id,session_id,status,submitted_at,proposed_count,proposed_start_ms,proposed_end_ms,duration_ms,video_sha256,object_path,video_bytes,touch_review) values($1,$2,$3,'pending',now(),25,1000,15000,20000,$4,'private/test.mp4',100,$5)`,[id,user,session,sha,JSON.stringify(fixture.touch_review)]);
 await db.query('select admin_review_create_session($1,$2)',[token,'reviewer@example.com']);
 return db;
}
async function verify(db:PGlite){await db.query('select admin_review_verify_evidence($1,$2,$3)',[token,id,sha]);}
async function finish(db:PGlite,overrides:unknown[]=[]){
 const args=[token,id,request,JSON.stringify(choices),25,1000,15000,'Confirmed the requested touches'];
 overrides.forEach((v,i)=>{if(v!==undefined)args[i]=v as never;});
 return db.query('select admin_review_finish($1,$2,$3,$4,$5,$6,$7,$8) as result',args);
}

test('timestamps map separate and overlapping compact clips back to the recording',()=>{
 assert.deepEqual(clipWindows(fixture),[{from:1000,to:3200,offset:0},{from:8000,to:10200,offset:2200}]);
 assert.deepEqual(momentClip(fixture,moments[1],4.4),{start:2.2,end:4.4,contact:3.2});
 assert.deepEqual(momentClip(fixture,moments[1],20),{start:8,end:10.2,contact:9});
 const overlap={...fixture,touch_review:{...fixture.touch_review!,moments:[{...moments[0],clipEndMS:9000},moments[1]]}};
 assert.deepEqual(clipWindows(overlap),[{from:1000,to:10200,offset:0}]);
});
test('login, password hashing, origins and strict body validation',()=>{
 const salt='a'.repeat(32),hash=scryptSync('a test password',salt,64,{N:32768,r:8,p:1,maxmem:67108864}).toString('hex');
 assert.equal(passwordMatches('a test password',`scrypt:${salt}:${hash}`),true);
 assert.equal(passwordMatches('wrong',`scrypt:${salt}:${hash}`),false);
 assert.equal(passwordMatches('anything','bad'),false);
 assert.notEqual(sessionHash('first'),sessionHash('second'));
 assert.equal(safeOrigin(new Request('https://juggledude.com',{headers:{Origin:'https://evil.test'}}),'https://juggledude.com'),false);
 assert.equal(safeOrigin(new Request('https://juggledude.com',{headers:{Origin:'https://juggledude.com'}}),'https://juggledude.com'),true);
 assert.equal(loginSchema.safeParse({email:'admin@example.com',password:'test',role:'admin'}).success,false);
 const body={requestId:request,choices,count:25,startMS:1000,endMS:15000,reason:'Checked',watched:true};
 assert.equal(finishSchema.safeParse(body).success,true);
 assert.equal(finishSchema.safeParse({...body,choices:[choices[0],choices[0]]}).success,false);
 assert.equal(finishSchema.safeParse({...body,watched:false}).success,false);
 assert.equal(finishSchema.safeParse({...body,count:Infinity}).success,false);
});
test('DB gates anonymous callers and expires/revokes sessions; queue works before streak migration',async()=>{
 const db=await database();try{
  const q=await db.query<{v:{items:{device_count:unknown}[];pending:number}}>('select admin_review_queue($1,$2,0) as v',[token,'pending']);
  assert.equal(q.rows[0].v.pending,1); assert.equal(q.rows[0].v.items[0].device_count,null);
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select public.admin_review_queue($1,$2,0)',[token,'pending']),/permission denied/);
   await assert.rejects(finish(db),/permission denied/);
   await db.exec('reset role');
  }
  await db.query('select admin_review_logout($1)',[token]);
  await assert.rejects(db.query('select admin_review_queue($1,$2,0)',[token,'pending']),/Unauthorized/);
 }finally{await db.close();}
});
test('persistent login limiter blocks after five attempts',async()=>{
 const db=await database();try{
  for(let i=0;i<5;i++)assert.equal((await db.query<{v:boolean}>('select admin_review_login_allowed($1,$2) as v',['c'.repeat(64),'d'.repeat(64)])).rows[0].v,true);
  assert.equal((await db.query<{v:boolean}>('select admin_review_login_allowed($1,$2) as v',['c'.repeat(64),'d'.repeat(64)])).rows[0].v,false);
 }finally{await db.close();}
});
test('a batch requires verified bytes, all exact moments, valid score and reason',async()=>{
 const db=await database();try{
  await assert.rejects(finish(db),/Verify the video/);
  await assert.rejects(db.query('select admin_review_verify_evidence($1,$2,$3)',[token,id,'c'.repeat(64)]),/Evidence unavailable/);
  await verify(db);
  await assert.rejects(finish(db,[undefined,undefined,undefined,JSON.stringify([choices[0]])]),/Decide every/);
  await assert.rejects(finish(db,[undefined,undefined,undefined,JSON.stringify([choices[0],choices[0]])]),/Invalid moment/);
  await assert.rejects(finish(db,[undefined,undefined,undefined,undefined,26]),/Invalid verified score/);
  await assert.rejects(finish(db,[undefined,undefined,undefined,undefined,25,1000,25000]),/Invalid verified score/);
  await assert.rejects(finish(db,[undefined,undefined,undefined,undefined,undefined,undefined,undefined,'  ']),/Invalid review/);
  assert.equal((await db.query<{status:string}>('select status from leaderboard_attempts')).rows[0].status,'pending');
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from private.leaderboard_reviews')).rows[0].n,0);
 }finally{await db.close();}
});
test('complete, partial and rejected reviews sync atomically and retries do not duplicate the audit',async()=>{
 for(const decision of ['confirm','mixed','reject']){
  const db=await database();try{
   await verify(db);
   const picked=choices.map((c,i)=>({...c,decision:decision==='reject'||decision==='mixed'&&i===1?'reject':'confirm'}));
   const no=decision==='reject';
   const args=[token,id,request,JSON.stringify(picked),no?null:decision==='mixed'?23:25,no?null:1000,no?null:15000,'Checked submitted evidence'];
   await finish(db,args); await finish(db,args);
   const rows=await db.query<{status:string;reviewed_count:number|null}>('select status,reviewed_count from leaderboard_attempts');
   assert.equal(rows.rows[0].status,no?'rejected':'approved');
   assert.equal(rows.rows[0].reviewed_count,no?null:decision==='mixed'?23:25);
   assert.equal((await db.query<{n:number}>('select count(*)::int as n from private.leaderboard_reviews')).rows[0].n,1);
   assert.equal((await db.query<{touch_count:number}>('select touch_count from juggling_sessions')).rows[0].touch_count,30,'immutable device total preserved');
   await assert.rejects(finish(db,[...args.slice(0,2),'40000000-0000-4000-8000-000000000002',...args.slice(3)]),/already changed/);
   await assert.rejects(finish(db,[...args.slice(0,7),'Changed retry payload']),/Idempotency conflict/);
  }finally{await db.close();}
 }
});
