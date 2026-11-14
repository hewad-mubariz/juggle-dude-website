import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {inviteFindSchema,inviteInventorySchema,inviteMarkSchema} from '../../lib/admin/validation';
import type {InviteCode,InviteInventory} from '../../lib/admin/invites';
const token='a'.repeat(64), code=(n:number)=>'FAKECODE'+String(n).padStart(10,'0');
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;
 create table private.admin_review_sessions(token_hash text,reviewer text,expires_at timestamptz);
 create table profiles(id uuid primary key,deletion_requested_at timestamptz);
 create table private.apple_subscriptions(user_id uuid,environment text,offer_code_redeemed boolean);`);
 const review=readFileSync(new URL('../../supabase/migrations/202610230002_admin_review_panel.sql',import.meta.url),'utf8');
 await db.exec(review.slice(review.indexOf('create function public.admin_review_session_valid('),review.indexOf('create function public.admin_review_logout(')));
 await db.exec(readFileSync(new URL('../../supabase/migrations/202611140002_admin_invite_inventory.sql',import.meta.url),'utf8'));
 await db.query("insert into private.admin_review_sessions values($1,'admin@example.test',now()+interval '1 hour')",[token]);
 await db.exec(`insert into private.admin_invite_batches(id,label,plan,expires_at) values
 ('1','Monthly tester','monthly',now()+interval '7 days'),('2','Expired yearly','yearly',now()-interval '1 day');`);
 for(let i=1;i<=31;i++)await db.query('insert into private.admin_invite_codes(batch_id,code,ordinal) values($1,$2,$3)',[i===31?'2':'1',code(i),i]);
 await db.exec(`insert into profiles values('20000000-0000-4000-8000-000000000001',null);
 insert into private.apple_subscriptions values('20000000-0000-4000-8000-000000000001','Production',true);`);
 return db;
}
async function inventory(db:PGlite,status='unmarked',offset=0,batch='all',key=token){return (await db.query<{v:InviteInventory}>('select public.admin_invite_inventory($1,$2,$3,$4) v',[key,batch,status,offset])).rows[0].v;}
async function find(db:PGlite,n=1){return (await db.query<{v:InviteCode}>('select public.admin_invite_find($1,$2) v',[token,code(n)])).rows[0].v;}
async function copy(db:PGlite,id:string){return (await db.query<{v:{code:string;url:string}|null}>('select public.admin_invite_copy($1,$2) v',[token,id])).rows[0].v;}
async function mark(db:PGlite,row:InviteCode,used=true){return (await db.query<{v:InviteCode}>('select public.admin_invite_mark($1,$2,$3,$4) v',[token,row.id,used,row.version])).rows[0].v;}
test('strict input validation keeps codes out of query parameters and rejects arbitrary mutations',()=>{
 assert.deepEqual(inviteInventorySchema.parse({}),{batch:'all',status:'unmarked',offset:0});
 assert.equal(inviteFindSchema.parse({code:'  fakecode0000000001  '}).code,code(1));
 for(const value of [{code:code(1)},{status:'available'},{offset:'1'},{batch:'bad'}])assert.equal(inviteInventorySchema.safeParse(value).success,false);
 for(const value of [{used:'true',version:0},{used:true,version:-1},{used:true,version:0,user_id:'other'}])assert.equal(inviteMarkSchema.safeParse(value).success,false);
});
test('lists are masked, paginated and keep expiry separate from manual redemption',async()=>{
 const db=await database();try{
  const first=await inventory(db),next=await inventory(db,'unmarked',25);
  assert.deepEqual(first.summary,{total:31,unmarked:30,used:0,expired:1,linked_invite_accounts:1});
  assert.equal(first.rows.length,25);assert.equal(next.rows.length,5);
  assert.equal(new Set([...first.rows,...next.rows].map(r=>r.id)).size,30);
  assert.ok(!JSON.stringify(first).includes('FAKECODE'));assert.ok(first.rows.every(r=>!('code'in r)&&!('url'in r)));
  const expired=await inventory(db,'expired');assert.equal(expired.total,1);assert.equal(expired.rows[0].expired,true);
  assert.equal((await inventory(db,'all',0,'1')).total,30);
 }finally{await db.close();}
});
test('copy does not mark sent or used; used/expired codes cannot be copied; undo is explicit and audited',async()=>{
 const db=await database();try{
  const row=await find(db);const value=await copy(db,row.id);
  assert.equal(value?.code,code(1));assert.ok(value?.url.includes('id=6820780610'));
  assert.equal((await find(db)).marked_used_at,null);assert.equal((await inventory(db)).summary.used,0);
  const used=await mark(db,row);assert.ok(used.marked_used_at);assert.equal(used.version,1);
  assert.equal(await copy(db,row.id),null);assert.equal((await inventory(db,'used')).total,1);
  const unmarked=await mark(db,used,false);assert.equal(unmarked.marked_used_at,null);assert.equal(unmarked.version,2);
  assert.equal((await copy(db,row.id))?.code,code(1));assert.equal(await copy(db,(await find(db,31)).id),null);
  assert.equal((await db.query<{n:number}>('select count(*)::integer n from private.admin_invite_audit')).rows[0].n,2);
  assert.equal((await inventory(db)).summary.linked_invite_accounts,1,'manual inventory marks never change verified analytics');
 }finally{await db.close();}
});
test('stale tabs cannot undo another action and repeat identical marks do not duplicate audit entries',async()=>{
 const db=await database();try{
  const row=await find(db),used=await mark(db,row);
  await assert.rejects(mark(db,row,false),/Stale code status/);
  await mark(db,used,true);
  assert.equal((await db.query<{n:number}>('select count(*)::integer n from private.admin_invite_audit')).rows[0].n,1);
 }finally{await db.close();}
});
test('all inventory operations require a valid admin session; mobile roles cannot read codes or execute RPCs',async()=>{
 const db=await database();try{
  const row=await find(db);
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await assert.rejects(inventory(db),/permission denied/);await assert.rejects(find(db),/permission denied/);
   await assert.rejects(copy(db,row.id),/permission denied/);await assert.rejects(mark(db,row),/permission denied/);
   await assert.rejects(db.query('select code from private.admin_invite_codes'),/permission denied/);await db.exec('reset role');
  }
  await assert.rejects(inventory(db,'unmarked',0,'all','wrong'),/Unauthorized/);
  await db.exec("update private.admin_review_sessions set expires_at=now()-interval '1 second'");
  await assert.rejects(copy(db,row.id),/Unauthorized/);await assert.rejects(find(db),/Unauthorized/);await assert.rejects(mark(db,row),/Unauthorized/);
 }finally{await db.close();}
});
