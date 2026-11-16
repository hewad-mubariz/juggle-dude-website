import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {returnsSchema} from '../../lib/admin/validation';
import type {PlayerReturns} from '../../lib/admin/returns';
const token='a'.repeat(64),user=(n:number)=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;
 create table private.admin_review_sessions(token_hash text,expires_at timestamptz);
 create table public.profiles(id uuid primary key,display_name text,country_code text,created_at timestamptz default now(),deletion_requested_at timestamptz);
 create table public.juggling_sessions(id uuid default gen_random_uuid(),user_id uuid,completed_at timestamptz,source text);
 create table private.apple_subscriptions(user_id uuid,environment text,offer_code_redeemed boolean,status int);`);
 const auth=readFileSync(new URL('../../supabase/migrations/202610230002_admin_review_panel.sql',import.meta.url),'utf8');
 await db.exec(auth.slice(auth.indexOf('create function public.admin_review_session_valid('),auth.indexOf('create function public.admin_review_logout(')));
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261116220629_admin_player_returns.sql',import.meta.url),'utf8'));
 await db.query("insert into private.admin_review_sessions values($1,now()+interval '1 hour')",[token]);
 for(let i=1;i<=11;i++)await db.query("insert into profiles(id,display_name,created_at) values($1,$2,now()-interval '180 days')",[user(i),`Player ${i}`]);
 await db.query("update profiles set deletion_requested_at=now() where id=$1",[user(5)]);
 await db.query("update profiles set created_at=now()+interval '1 day' where id=$1",[user(11)]);
 const stamp="(now() at time zone 'Europe/Berlin')::date::timestamp";
 for(const n of [1,9,10])await db.query(`insert into juggling_sessions(user_id,completed_at,source) values
  ($1,(${stamp}-interval '120 days') at time zone 'Europe/Berlin','recording'),
  ($1,(${stamp}-interval '119 days') at time zone 'Europe/Berlin','gallery')`,[user(n)]);
 await db.query(`insert into juggling_sessions(user_id,completed_at,source) values
  ($1,(${stamp}-interval '1 day') at time zone 'Europe/Berlin','recording'),
  ($1,(${stamp}-interval '1 day'+interval '2 hours') at time zone 'Europe/Berlin','gallery'),
  ($2,now(),'recording'),($3,now(),'recording'),($4,now()+interval '1 day','recording'),
  ($5,'2026-03-28T22:30:00Z','recording'),($5,'2026-03-28T23:30:00Z','gallery'),
  ($6,'2026-10-24T22:30:00Z','recording'),($6,'2026-10-25T00:30:00Z','gallery')`,[2,3,5,6,7,8].map(user));
 await db.query("insert into private.apple_subscriptions values($1,'Production',true,2),($1,'Production',true,1),($2,'Sandbox',true,1)",[user(9),user(10)]);
 return db;
}
async function returns(db:PGlite,group='returned',cohort='exclude_invites',offset=0,key=token){
 return (await db.query<{value:PlayerReturns}>('select public.admin_analytics_returns($1,$2,$3,$4) value',[key,cohort,group,offset])).rows[0].value;
}
test('return filters are bounded and cannot silently accept overview filters',()=>{
 assert.deepEqual(returnsSchema.parse({}),{cohort:'exclude_invites',group:'returned',offset:0});
 for(const input of [{group:'never'},{cohort:'bad'},{offset:'1'},{offset:'-25'},{offset:'100025'},{days:'7'},{source:'gallery'},{sql:'select'}])assert.equal(returnsSchema.safeParse(input).success,false);
});
test('lifetime groups partition accounts; clips, UTC midnight and DST do not fake return days',async()=>{
 const db=await database();try{
  const before=(await db.query<{count:number}>('select count(*) from juggling_sessions')).rows[0].count;
  const data=await returns(db);
  assert.deepEqual(data.summary,{accounts:8,returned:3,not_returned:3,no_sessions:2,first_day_today:1});
  assert.deepEqual(new Set(data.rows.map(p=>p.user_id)),new Set([1,7,10].map(user)));
  assert.ok(data.rows.find(p=>p.user_id===user(1))!.days_since_last!>90,'a return before the overview window still counts');
  const one=await returns(db,'not_returned');
  assert.equal(one.rows.find(p=>p.user_id===user(2))!.sessions,2);
  assert.equal(one.rows.find(p=>p.user_id===user(8))!.active_days,1,'UTC midnight within one Berlin day is not a return');
  assert.equal(one.rows.filter(p=>p.first_day_today).length,1);
  const none=await returns(db,'no_sessions');assert.deepEqual(new Set(none.rows.map(p=>p.user_id)),new Set([4,6].map(user)));
  assert.ok(none.rows.every(p=>p.last_session===null&&p.days_since_last===null));
  assert.equal((await returns(db,'returned','all')).summary.accounts,9);
  const invited=await returns(db,'returned','invites_only');assert.equal(invited.total,1);assert.equal(invited.rows[0].user_id,user(9));
  assert.equal((await db.query<{count:number}>('select count(*) from juggling_sessions')).rows[0].count,before,'read-only');
 }finally{await db.close();}
});
test('whole-page stable pagination covers every player without repeats',async()=>{
 const db=await database();try{
  for(let i=100;i<155;i++)await db.query("insert into profiles(id,display_name,created_at) values($1,'Same timestamp',now()-interval '20 days')",[user(i)]);
  const pages=await Promise.all([0,25,50].map(offset=>returns(db,'no_sessions','exclude_invites',offset)));
  assert.deepEqual(pages.map(p=>p.rows.length),[25,25,7]);assert.ok(pages.every(p=>p.total===57));
  assert.equal(new Set(pages.flatMap(p=>p.rows.map(r=>r.user_id))).size,57);
 }finally{await db.close();}
});
test('mobile roles, invalid sessions and filters cannot access private return data',async()=>{
 const db=await database();try{
  await assert.rejects(returns(db,'returned','all',0,'wrong'),/Unauthorized/);
  for(const args of [['bad','all',0],['returned','bad',0],['returned','all',1],['returned','all',100025]])await assert.rejects(returns(db,...args as [string,string,number]),/Invalid return/);
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(returns(db),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');assert.ok((await returns(db)).total);await db.exec('reset role');
  await db.exec("update private.admin_review_sessions set expires_at=now()-interval '1 second'");await assert.rejects(returns(db),/Unauthorized/);
 }finally{await db.close();}
});
