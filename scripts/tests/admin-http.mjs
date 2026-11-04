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
assert.equal((await call('analytics')).status,401);
assert.equal((await call('leaderboard')).status,401);
assert.equal((await call('analytics/players/20000000-0000-4000-8000-000000000001')).status,401);
assert.equal((await call('attempts/'+id+'/video')).status,401);
assert.equal((await call('login',{email:'reviewer@example.test',password:'wrong'},{Origin:'https://untrusted.test'})).status,403);
const login=await call('login',{email:'reviewer@example.test',password:'local fixture password'});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
assert.match(login.headers.get('set-cookie'),/HttpOnly/i);assert.match(login.headers.get('set-cookie'),/Secure/i);assert.match(login.headers.get('set-cookie'),/SameSite=strict/i);
let queue=await (await call('queue?status=pending&offset=0')).json();
assert.equal(queue.pending,1);assert.equal(queue.items[0].player_name,'Demo Player');

for (const params of ['days=365','source=other','offset=-1','days=7&days=30','list=arbitrary','sql=select']) {
 assert.equal((await call('analytics?'+params)).status,400);
}
const analyticsResponse=await call('analytics?days=30');
assert.equal(analyticsResponse.status,200);assert.match(analyticsResponse.headers.get('cache-control'),/no-store/);
const analytics=await analyticsResponse.json();
assert.equal(analytics.summary.pro_accounts,3);assert.ok(analytics.summary.sessions>25);assert.equal(analytics.rows.length,25);
assert.ok(analytics.rows.every(row=>typeof row.leaderboard_visible==='boolean'));
assert.ok(analytics.rows.some(row=>row.leaderboard_visible===true));
assert.ok(analytics.rows.some(row=>row.leaderboard_visible===false));
assert.equal(analytics.daily.length,30);assert.equal(analytics.summary.sessions,analytics.daily.reduce((n,d)=>n+d.sessions,0));
const imports=await (await call('analytics?days=30&source=gallery')).json();
assert.ok(imports.summary.sessions<analytics.summary.sessions);assert.equal(imports.summary.pro_accounts,3);
const next=await (await call('analytics?days=30&offset=25')).json();
assert.equal(new Set([...analytics.rows,...next.rows].map(r=>r.user_id+'/'+r.id)).size,50);
for (const list of ['players','accounts','pro']) {
 const view=await (await call('analytics?days=30&list='+list)).json();assert.equal(view.list,list);assert.ok(view.total>0);assert.ok(view.rows.every(row=>typeof row.leaderboard_visible==='boolean'));
}
const playerPath='analytics/players/20000000-0000-4000-8000-000000000001';
const playerResponse=await call(playerPath+'?session=30000000-0000-4000-8000-000000000001');
assert.equal(playerResponse.status,200);assert.match(playerResponse.headers.get('cache-control'),/no-store/);
const player=await playerResponse.json();assert.equal(player.profile.player,'Demo Player');assert.equal(player.selected_session.streak_touches,23);assert.equal(player.profile.leaderboard_visible,true);
assert.equal((await call('analytics/players/not-a-uuid')).status,400);
assert.equal((await call('analytics/players/20000000-0000-4000-8000-000000000099')).status,404);
for(const params of ['offset=1','offset=0&offset=25','session=bad','sql=select'])assert.equal((await call(playerPath+'?'+params)).status,400);
for(const params of ['period=bad','period=week&period=all_time','user_id=secret','limit=1000'])assert.equal((await call('leaderboard?'+params)).status,400);
for(const period of ['week','all_time']){
 const boardResponse=await call('leaderboard?period='+period);assert.equal(boardResponse.status,200);assert.match(boardResponse.headers.get('cache-control'),/no-store/);
 const board=await boardResponse.json();assert.equal(board.period,period);assert.equal(board.joined_players,7);assert.equal(board.limit,100);
 assert.ok(board.entries.length>0);assert.ok(board.total_players<board.joined_players,'joined without a qualifying score is not ranked');
 assert.deepEqual(board.entries.map(row=>row.rank),board.entries.map((_,i)=>i+1));
 assert.equal(new Set(board.entries.map(row=>row.user_id)).size,board.entries.length);
 assert.ok(!board.entries.some(row=>row.user_id.endsWith('000000000099')||row.user_id.endsWith('000000000008')),'waiting and hidden players do not rank');
 assert.ok(board.entries.every(row=>!('email' in row)&&!('avatar_path' in row)&&!('session_id' in row)));
 const entry=board.entries[0],account=await (await call('analytics/players/'+entry.user_id)).json();
 assert.equal(account.profile.leaderboard_visible,true);assert.equal(account.profile.player,entry.display_name);
}
const hidden=await (await call('analytics/players/50000000-0000-4000-8000-000000000008')).json();assert.equal(hidden.profile.leaderboard_visible,false);
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
assert.equal((await call('analytics')).status,401,'analytics rejects a revoked cookie');
assert.equal((await call(playerPath)).status,401,'player details reject a revoked cookie');
assert.equal((await call('leaderboard')).status,401,'leaderboard rejects a revoked cookie');
console.log('Isolated HTTP checks passed: login, cookies, access/origin checks, video verification/ranges, partial batch, account readback, idempotency, stale conflict, and logout.');
