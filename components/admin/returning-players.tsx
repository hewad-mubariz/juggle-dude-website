'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '@/lib/admin/client';
import type { AnalyticsCohort } from '@/lib/admin/analytics';
import type { PlayerReturns, ReturnGroup } from '@/lib/admin/returns';
import { number, time } from '@/lib/admin/analytics-format';
import { LeaderboardStatus } from './leaderboard-status';

const groups: { id: ReturnGroup; label: string; help: string }[] = [
 {id:'returned',label:'Returned',help:'Played on at least two different days.'},
 {id:'not_returned',label:'Not returned yet',help:'All saved sessions are from one day.'},
 {id:'no_sessions',label:'No sessions yet',help:'An account, but no saved juggling session.'},
];
function returnsQuery(cohort: AnalyticsCohort, group: ReturnGroup, offset: number) {
 return {queryKey:['admin-returns',cohort,group,offset],staleTime:60000,
  queryFn:({signal}:{signal:AbortSignal})=>api<PlayerReturns>(`analytics/returns?cohort=${cohort}&group=${group}&offset=${offset}`,undefined,signal)};
}
export function ReturningPlayers({cohort,onOpen}:{cohort:AnalyticsCohort;onOpen:(id:string)=>void}) {
 const cache=useQueryClient();
 const [group,setGroup]=useState<ReturnGroup|null>(null),[offset,setOffset]=useState(0);
 const overview=useQuery(returnsQuery(cohort,'returned',0));
 const query=useQuery({...returnsQuery(cohort,group??'returned',offset),enabled:group!==null,
  placeholderData:previous=>previous?.cohort===cohort&&previous.group===group?previous:undefined});
 const summary=overview.data?.summary, records=query.data, selected=groups.find(g=>g.id===group);
 useEffect(()=>{
  if([overview.error,query.error].some(e=>e instanceof RequestError&&[401,403].includes(e.status))) void cache.invalidateQueries({queryKey:['admin-session']});
 },[overview.error,query.error,cache]);
 function refresh(){void cache.invalidateQueries({queryKey:['admin-returns']});}
 return <section className="analytics-returns" aria-label="Returning players">
  <div className="analytics-return-heading"><div><h2>Do players come back?</h2><p>All saved history · all session sources · German calendar days</p></div>
   <button className="analytics-expand" onClick={refresh} disabled={overview.isFetching||query.isFetching}>{overview.isFetching||query.isFetching?'Updating…':'Refresh return data'}</button></div>
  <p className="analytics-scope">Uses the invite-code filter above, independently of the 7 / 30 / 90-day period and session source. A return means a saved juggling session on a later day; app opens and guest activity aren’t recorded here.</p>
  {overview.error&&<p role="alert" className="admin-notice">{summary?'Showing the last snapshot. ':''}Return data couldn’t refresh. {overview.error.message}</p>}
  <div className="admin-stats analytics-return-stats" role="group" aria-label="Player return groups">
   {groups.map(g=><button key={g.id} className={`admin-stat analytics-stat-link ${g.id==='returned'?'lime':''}`} aria-label={`View ${g.label.toLowerCase()}`} aria-pressed={group===g.id} onClick={()=>{setGroup(g.id);setOffset(0);}}>
    <span>{g.label}<i aria-hidden="true">↗</i></span><strong>{summary?number(summary[g.id]):'—'}</strong><small>{g.help}</small>
    {g.id==='not_returned'&&summary&&<small className="analytics-return-today">{number(summary.first_day_today)} first played today</small>}
   </button>)}
  </div>
  <p className="analytics-return-note">“Not returned yet” includes new players still on their first day. It does not mean they have stopped using the app.</p>
  {selected&&<section className="admin-queue analytics-return-list" aria-label={`${selected.label} players`}>
   <div className="admin-queue-header"><div><h3>{selected.label} <span>{records?number(records.total):'—'}</span></h3><p>{selected.help} Select a player to see their full history.</p></div><button className="analytics-expand" onClick={()=>setGroup(null)}>Close list</button></div>
   {query.error&&<p role="alert" className="admin-notice">{records?'Showing the last loaded players. ':''}{query.error.message} <button onClick={()=>void query.refetch()}>Retry list</button></p>}
   <div className="analytics-return-records" aria-busy={query.isFetching}>
    {!records?<p className="admin-empty" role="status">{query.error?'This list is unavailable.':'Loading players…'}</p>:!records.rows.length?<p className="admin-empty">No players in this group.</p>:
     <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Player</th><th>Sessions</th><th>Active days</th><th>{group==='no_sessions'?'Joined':'First session'} · Germany</th><th>Last session · Germany</th><th>Days since last</th><th>Leaderboard</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>
      {records.rows.map(p=><tr key={p.user_id} className="analytics-clickable-row" onClick={()=>onOpen(p.user_id)}>
       <td><button className="admin-player analytics-player-link" onClick={e=>{e.stopPropagation();onOpen(p.user_id);}} aria-label={`View ${p.player} account`}><span className="admin-player-initial" aria-hidden="true">{p.player.slice(0,2).toUpperCase()}</span><div><strong>{p.player}</strong><small>{p.user_id.slice(0,8)}{p.country?` · ${p.country}`:''}</small></div></button>{p.first_day_today&&<small className="analytics-return-today">First day today</small>}</td>
       <td>{number(p.sessions)}</td><td>{number(p.active_days)}</td><td>{time(group==='no_sessions'?p.created_at:p.first_session)}</td><td>{time(p.last_session,'—')}</td><td>{p.days_since_last===null?'—':p.days_since_last===0?'Today':`${number(p.days_since_last)}d`}</td><td><LeaderboardStatus joined={p.leaderboard_visible}/></td><td><button className="admin-row-action" aria-label={`Open ${p.player} details`} onClick={e=>{e.stopPropagation();onOpen(p.user_id);}}>↗</button></td>
      </tr>)}
     </tbody></table></div>}
   </div>
   <footer className="admin-pagination"><span>{records?.rows.length?`${number(records.offset+1)}–${number(records.offset+records.rows.length)} of ${number(records.total)}`:records?'0 shown':'Loading…'}{query.isFetching&&records?' · Updating…':''}</span><div>
    <button disabled={offset===0||query.isFetching||!records||query.isPlaceholderData} onClick={()=>setOffset(offset-25)}>← Previous</button>
    <button disabled={!records||offset+25>=records.total||offset>=100000||query.isFetching||query.isPlaceholderData} onClick={()=>setOffset(offset+25)}>Next →</button>
   </div></footer>
  </section>}
 </section>;
}
