'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '@/lib/admin/client';
import type { AdminLeaderboard, LeaderboardPeriod } from '@/lib/admin/leaderboard';
import { country, duration, number, time } from '@/lib/admin/analytics-format';
import { PlayerDetails } from './analytics-player';
import './analytics.css';

export function LeaderboardPanel() {
  const cache = useQueryClient();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['admin-leaderboard', period],
    queryFn: ({ signal }) => api<AdminLeaderboard>(`leaderboard?period=${period}`, undefined, signal),
    staleTime: 30000,
  });
  useEffect(() => {
    if (query.error instanceof RequestError && [401, 403].includes(query.error.status)) void cache.invalidateQueries({ queryKey: ['admin-session'] });
  }, [query.error, cache]);
  const data = query.data;
  // A refresh can remove players. Clamp the displayed page without a second fetch.
  const pageOffset = data ? Math.min(offset, Math.max(0, Math.ceil(data.entries.length / 25) - 1) * 25) : 0;
  const rows = data?.entries.slice(pageOffset, pageOffset + 25) || [];
  const periodLabel = period === 'week' ? 'This week' : 'All time';
  return <div className="analytics-panel leaderboard-panel">
    <div className="admin-page-heading analytics-heading">
      <div><p className="admin-kicker">THE STANDINGS</p><h1>Leaderboard<span>.</span></h1><p>See who joined and how players rank in the app.</p></div>
      <button className="admin-btn secondary" disabled={query.isFetching} onClick={() => void query.refetch()}><span aria-hidden="true">↻</span>{query.isFetching ? 'Refreshing…' : 'Refresh leaderboard'}</button>
    </div>
    <div className="analytics-toolbar">
      <div className="analytics-periods" role="group" aria-label="Leaderboard period">
        {(['week', 'all_time'] as const).map(value => <button key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setOffset(0); }}>{value === 'week' ? 'This week' : 'All time'}</button>)}
      </div>
      <span className="analytics-updated">{data ? `Updated ${time(data.generated_at)}` : 'Loading standings…'} · German time</span>
    </div>
    <p className="analytics-scope">Same rankings as Juggle Dude: each participating player’s best device-counted continuous streak from camera recordings. Imports and rejected scores do not rank. Weeks start Monday at 00:00 UTC.</p>
    {query.error && <div role="alert" className="admin-notice">{data ? 'Showing the last loaded standings. ' : ''}{query.error.message} <button onClick={() => void query.refetch()}>Retry leaderboard</button></div>}
    <section className="admin-stats leaderboard-stats" aria-label="Leaderboard overview">
      <div className="admin-stat lime"><span>Joined</span><strong>{data ? number(data.joined_players) : '—'}</strong><small>Currently opted in · all dates</small></div>
      <div className="admin-stat"><span>Ranked players</span><strong>{data ? number(data.total_players) : '—'}</strong><small>{periodLabel} · with a qualifying streak</small></div>
      <div className="admin-stat"><span>Joined, not ranked</span><strong>{data ? number(Math.max(0, data.joined_players - data.total_players)) : '—'}</strong><small>No qualifying score {period === 'week' ? 'this week' : 'yet'}</small></div>
    </section>
    <section className="admin-queue analytics-table-section" aria-label="Leaderboard standings">
      <div className="admin-queue-header"><div><h2>{periodLabel} <span>{data ? number(data.total_players) : '—'}</span></h2><p>{period === 'week' && data ? `Week started ${time(data.week_starts_at)} German time.` : 'Best qualifying recorded streak per player.'}</p></div><span className="analytics-table-status" role="status">{query.isFetching ? 'Updating…' : 'Select a player for account details'}</span></div>
      <div className="analytics-records-region" aria-busy={query.isFetching}>
        {!data ? <div className="admin-empty" role="status">{query.error ? 'Standings are unavailable.' : 'Loading leaderboard…'}</div> : !rows.length ? <div className="admin-empty"><h3>No ranked players {period === 'week' ? 'this week' : 'yet'}.</h3><p>Players need to join and save a qualifying camera-recorded streak.</p></div> :
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Best streak</th><th scope="col">Streak length</th><th scope="col">Achieved · Germany</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{rows.map(player => <tr key={player.user_id} className="analytics-clickable-row" onClick={() => setSelected(player.user_id)}>
            <td><span className={`leaderboard-rank ${player.rank <= 3 ? 'podium' : ''}`}>#{number(player.rank)}</span></td>
            <td><button className="admin-player analytics-player-link" onClick={() => setSelected(player.user_id)} aria-label={`View ${player.display_name} account`}><span className="admin-player-initial" aria-hidden="true">{player.display_name.slice(0, 2).toUpperCase()}</span><span><strong>{player.display_name}</strong><small>{country(player.country_code)}</small></span></button></td>
            <td><strong className="analytics-cell-number">{number(player.touches)}</strong><small>touches</small></td>
            <td>{player.streak_duration_ms === null ? 'Unavailable' : duration(player.streak_duration_ms / 1000)}</td><td>{time(player.achieved_at)}</td>
            <td><button className="admin-row-action" onClick={() => setSelected(player.user_id)}>View player →</button></td>
          </tr>)}</tbody></table></div>}
      </div>
      <footer className="admin-pagination"><span>{data ? rows.length ? `${number(pageOffset + 1)}–${number(pageOffset + rows.length)} of ${number(data.entries.length)} shown${data.total_players > data.limit ? ` · ${number(data.total_players)} ranked overall` : ''}` : '0 ranked players' : 'Loading records…'}</span><div>
        <button disabled={!data || pageOffset === 0} onClick={() => setOffset(Math.max(0, pageOffset - 25))}>← Previous</button>
        <button disabled={!data || pageOffset + 25 >= data.entries.length} onClick={() => setOffset(pageOffset + 25)}>Next →</button>
      </div></footer>
      <p className="analytics-pro-note">{data && data.total_players > data.limit ? `Showing the top ${data.limit} players from the app’s leaderboard service. ` : ''}“Joined” is the current visibility setting, not a past join event. Joined players can have no qualifying score yet. Open a player to see their account, Pro access and complete synced history.</p>
    </section>
    {selected && <PlayerDetails key={selected} userId={selected} onClose={() => setSelected(null)} />}
  </div>;
}
