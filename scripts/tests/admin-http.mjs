// Run only against the isolated preload fixture on localhost:4175.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const origin='http://localhost:4175',id='10000000-0000-4000-8000-000000000001';let cookie='';
async function call(path,body,extra={}){
 const url=new URL('/api/admin/'+path,origin);url.pathname=url.pathname.replace(/\/?$/,'/');
 const response=await fetch(url,{method:body===undefined?'GET':'POST',redirect:'error',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return response;
}
assert.equal((await call('queue')).status,401);
assert.equal((await call('attempts/'+id+'/video')).status,401);
assert.equal((await call('login',{email:'reviewer@example.test',password:'wrong'},{Origin:'https://untrusted.test'})).status,403);
const login=await call('login',{email:'reviewer@example.test',password:'local fixture password'});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
assert.match(login.headers.get('set-cookie'),/HttpOnly/i);assert.match(login.headers.get('set-cookie'),/Secure/i);assert.match(login.headers.get('set-cookie'),/SameSite=strict/i);
let queue=await (await call('queue?status=pending&offset=0')).json();
assert.equal(queue.pending,1);assert.equal(queue.items[0].player_name,'Demo Player');

const base='attempts/'+id;
const unverified=await call(base+'/finish',{requestId:crypto.randomUUID(),choices:[],count:null,startMS:null,endMS:null,reason:'Test',watched:true});
assert.equal(unverified.status,422);
const verification=await call(base+'/verify',{});assert.equal(verification.status,200);assert.equal((await verification.json()).verified,true);
const video=await call(base+'/video');assert.equal(video.status,200);assert.match(video.headers.get('cache-control'),/no-store/);
const bytes=new Uint8Array(await video.arrayBuffer());assert.ok(bytes.length>100);assert.equal(createHash('sha256').update(bytes).digest('hex').length,64);
const partial=await call(base+'/video',undefined,{Range:'bytes=0-31'});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,32);
const body={requestId:crypto.randomUUID(),choices:[{id:'handsUncertain-2000',decision:'confirm'},{id:'groundContact-9000',decision:'reject'}],count:24,startMS:1000,endMS:15000,reason:'Isolated HTTP integration check',watched:true};
const saved=await call(base+'/finish',body);assert.equal(saved.status,200);assert.equal((await saved.json()).status,'approved');
assert.equal((await call(base+'/finish',body)).status,200,'lost-response retry is idempotent');
assert.equal((await call(base+'/finish',{...body,requestId:crypto.randomUUID()})).status,409,'stale review refused');
const detail=await (await call(base)).json();assert.equal(detail.attempt.status,'approved');assert.equal(detail.attempt.reviewed_count,24);assert.equal(detail.previous.choices[1].decision,'reject');
queue=await (await call('queue?status=approved&offset=0')).json();assert.equal(queue.approved,1);
assert.equal((await call('logout',{})).status,200);assert.equal((await call('queue')).status,401,'revoked cookie refused');
console.log('Isolated HTTP checks passed: login, cookies, access/origin checks, video verification/ranges, partial batch, account readback, idempotency, stale conflict, and logout.');
