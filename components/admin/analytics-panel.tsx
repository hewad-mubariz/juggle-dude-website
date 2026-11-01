'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RequestError } from '@/lib/admin/client';
import { analyticsDays } from '@/lib/admin/analytics';
import type { Analytics, AnalyticsDaily, AnalyticsDays, AnalyticsList, AnalyticsSource } from '@/lib/admin/analytics';
import { PlayerDetails } from './analytics-player';
import { analyticsQuery } from '@/lib/admin/analytics-query';
import { number, time, day, country, duration } from '@/lib/admin/analytics-format';
import './analytics.css';

const tabs: { id: AnalyticsList; label: string; help: string }[] = [
  { id: 'sessions', label: 'Recent sessions', help: 'Latest completed sessions in this period. Recordings and imports follow the source filter.' },
  { id: 'players', label: 'Active players', help: 'Most sessions first. Active days counts distinct German calendar days in this period.' },
  { id: 'accounts', label: 'New accounts', help: 'Accounts created in this period. Session totals cover their entire saved history, across all sources.' },
  { id: 'pro', label: 'Linked Pro', help: 'Current production access linked to an account, across all dates. Sandbox and unlinked guest purchases are excluded.' },
];

export function AnalyticsPanel() {
  const cache = useQueryClient();
  const [days, setDays] = useState<AnalyticsDays>(7);
  const [source, setSource] = useState<AnalyticsSource>('all');
  const [list, setList] = useState<AnalyticsList>('sessions');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{ userId: string; sessionId?: string } | null>(null);
  const table = useRef<HTMLElement>(null);
  // Overview has its own stable key: changing a table tab never removes the charts.
  // The initial sessions table shares this query, so the first request is deduplicated.
  const overview = useQuery(analyticsQuery(days, source, 'sessions', 0));
  const query = useQuery({
    ...analyticsQuery(days, source, list, offset),
    placeholderData: previous => previous?.list === list && previous.days === days && previous.source === source ? previous : undefined,
  });
  useEffect(() => {
    if ([overview.error, query.error].some(error => error instanceof RequestError && [401, 403].includes(error.status))) {
      void cache.invalidateQueries({ queryKey: ['admin-session'] });
    }
  }, [overview.error, query.error, cache]);
  useEffect(() => {
    if (!overview.data) return;
    for (const tab of tabs) if (tab.id !== 'sessions') void cache.prefetchQuery(analyticsQuery(days, source, tab.id, 0));
  }, [overview.data, days, source, cache]);
  const data = overview.data;
  const records = query.data;
  const tab = tabs.find(t => t.id === list)!;
  function choose(next: AnalyticsList, scroll = false) {
    setList(next); setOffset(0);
    if (scroll) table.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function open(userId: string, sessionId?: string) { setSelected({ userId, sessionId }); }
  function refresh() { void cache.invalidateQueries({ queryKey: ['admin-analytics'] }); }
  return <div className="analytics-panel">
    <div className="admin-page-heading analytics-heading">
      <div><p className="admin-kicker">THE BIG PICTURE</p><h1>In play<span>.</span></h1><p>See who’s playing, coming back and making it Pro.</p></div>
      <button className="admin-btn secondary" onClick={refresh} disabled={overview.isFetching || query.isFetching}>
        <span aria-hidden="true">↻</span>{overview.isFetching || query.isFetching ? 'Refreshing…' : 'Refresh analytics'}
      </button>
    </div>
    <div className="analytics-toolbar">
      <div className="analytics-periods" role="group" aria-label="Analytics period">
        {analyticsDays.map(value => <button key={value} aria-pressed={days === value} onClick={() => { setDays(value); setOffset(0); }}>{value} days</button>)}
      </div>
      <label>Session source<select value={source} onChange={e => { setSource(e.target.value as AnalyticsSource); setOffset(0); }}>
        <option value="all">All sessions</option><option value="recording">Camera recordings</option><option value="gallery">Video imports</option>
      </select></label>
      <span className="analytics-updated">{data ? `Updated ${time(data.generated_at)}` : 'Loading snapshot…'} · German time</span>
    </div>
    <p className="analytics-scope">Synced juggling sessions from signed-in players. Guest activity, app opens and Power Shot usage aren’t included. Periods include today so far.</p>
    {overview.error && <div role="alert" className="admin-notice">{data ? 'Showing the last snapshot. ' : ''}Analytics couldn’t refresh. {overview.error.message} <button onClick={refresh}>Retry analytics</button></div>}
    {!data ? <div className="analytics-loading" role="status">{overview.error ? 'The overview is unavailable.' : 'Loading your activity…'}</div> : <>
      <section className="admin-stats analytics-stats" aria-label="Analytics overview">
        <Stat label="Active players" value={data.summary.players} note={`${number(data.summary.returning_players)} played on 2+ days`} highlight onClick={() => choose('players', true)} />
        <Stat label="Synced sessions" value={data.summary.sessions} note={`${number(data.summary.recordings)} recorded · ${number(data.summary.imports)} imported`} onClick={() => choose('sessions', true)} />
        <Stat label="New accounts" value={data.summary.new_accounts} note={`${number(data.summary.new_accounts_with_sessions)} have a synced session · all sources`} onClick={() => choose('accounts', true)} />
        <Stat label="Linked Pro accounts" value={data.summary.pro_accounts} note="Current production access · all dates" onClick={() => choose('pro', true)} />
      </section>
      <div className="analytics-grid">
        <Activity daily={data.daily} average={data.summary.average_duration_seconds} />
        <section className="analytics-card analytics-breakdowns" aria-label="Player breakdowns">
          <Breakdown title="App versions" subtitle="Latest session per active player" rows={data.versions.map(v => ({ label: v.app_version, value: v.players }))} />
          <Breakdown title="Player countries" subtitle="Optional profile country, not device location" rows={data.countries.map(c => ({ label: country(c.country), value: c.players }))} />
        </section>
      </div>
    </>}
    <section ref={table} className="admin-queue analytics-table-section" aria-label="Activity details">
      <div className="admin-tabs analytics-tabs" role="group" aria-label="Analytics details">
        {tabs.map(t => <button key={t.id} aria-pressed={list === t.id} className={list === t.id ? 'active' : ''} onClick={() => choose(t.id)}>{t.label}</button>)}
      </div>
      <div className="admin-queue-header"><div><h2>{tab.label} <span>{records ? number(records.total) : '—'}</span></h2><p>{tab.help}</p></div><span className="analytics-table-status" role="status">{query.isFetching ? 'Updating…' : 'Select a player or session for details'}</span></div>
      {query.error && <div role="alert" className="admin-notice">{records ? 'Showing the last loaded records. ' : ''}{query.error.message} <button onClick={() => void query.refetch()}>Retry list</button></div>}
      <div className="analytics-records-region" aria-busy={query.isFetching}>
        {!records ? <div className="admin-empty" role="status">{query.error ? 'This list is unavailable.' : `Loading ${tab.label.toLowerCase()}…`}</div>
          : !records.rows.length ? <div className="admin-empty"><h3>{offset ? 'No more results.' : 'No matching records yet.'}</h3><p>{list === 'pro' ? 'Linked production Pro accounts will appear here after verification.' : 'Try a longer period or another session source.'}</p></div>
          : <Records data={records} onOpen={open} />}
      </div>
      <footer className="admin-pagination"><span>{records ? records.rows.length ? `${number(records.offset + 1)}–${number(records.offset + records.rows.length)} of ${number(records.total)}` : `0 shown · ${number(records.total)} total` : 'Loading records…'}</span><div>
        <button disabled={offset === 0 || query.isFetching || !records || query.isPlaceholderData} onClick={() => setOffset(Math.max(0, offset - 25))}>← Previous</button>
        <button disabled={!records || offset + 25 >= records.total || offset >= 100000 || query.isFetching || query.isPlaceholderData} onClick={() => setOffset(offset + 25)}>Next →</button>
      </div></footer>
      <p className="analytics-pro-note">{list === 'pro' ? 'Latest stored Apple verification. Promotional access can be included. These are entitlements, not paid sales or revenue; use App Store Connect for sales.' : 'Select a name to open the account and its full history. Select a session to inspect its count, timestamps, source and app version. Your current filters and page stay in place when you close the details.'}</p>
    </section>
    <p className="admin-bottom-note">Session source affects activity, players and breakdowns. New accounts use all sources; Pro is a current snapshot. Open a player to see their full history.</p>
    {selected && <PlayerDetails key={`${selected.userId}/${selected.sessionId || ''}`} {...selected} onClose={() => setSelected(null)} />}
  </div>;
}

function Stat({ label, value, note, highlight = false, onClick }: { label: string; value: number; note: string; highlight?: boolean; onClick: () => void }) {
  return <button className={`admin-stat analytics-stat-link ${highlight ? 'lime' : ''}`} onClick={onClick} aria-label={`View ${label.toLowerCase()}`}><span>{label}<i aria-hidden="true">↗</i></span><strong>{number(value)}</strong><small>{note}</small></button>;
}

function Activity({ daily, average }: { daily: AnalyticsDaily[]; average: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = daily.find(d => d.day === selected) || daily.at(-1)!;
  const max = Math.max(1, ...daily.map(d => d.sessions));
  return <section className="analytics-card analytics-activity">
    <div className="analytics-card-heading"><div><h2>Daily activity</h2><p>{day(daily[0].day)} – {day(daily.at(-1)!.day)} · {duration(average)} average clip</p></div>
      <div className="analytics-legend"><span><i />Recordings</span><span><i />Imports</span></div>
    </div>
    <div className="analytics-chart-scale"><span>{number(max)} sessions</span><span>0</span></div>
    <div className="analytics-chart" role="group" aria-label="Daily sessions, select a day for details">
      {daily.map(d => <button key={d.day} className={`analytics-day ${active.day === d.day ? 'selected' : ''}`} onClick={() => setSelected(d.day)} onFocus={() => setSelected(d.day)}
        aria-label={`${day(d.day)}: ${d.sessions} sessions, ${d.players} players, ${d.recordings} recordings, ${d.imports} imports`}
        title={`${day(d.day)} · ${d.sessions} sessions · ${d.players} players`}>
        <span className="analytics-bar" style={{ height: `${d.sessions / max * 100}%` }}>
          <span className="analytics-bar-import" style={{ flex: d.imports }} /><span className="analytics-bar-recording" style={{ flex: d.recordings }} />
        </span>
      </button>)}
    </div>
    <div className="analytics-chart-dates"><span>{day(daily[0].day)}</span><span>{day(daily[Math.floor(daily.length / 2)].day)}</span><span>{day(daily.at(-1)!.day)}</span></div>
    <div className="analytics-day-detail" aria-live="polite"><strong>{day(active.day)}</strong><span>{number(active.sessions)} sessions</span><span>{number(active.players)} players</span></div>
    <details className="analytics-daily-table"><summary>View daily figures</summary><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Day</th><th scope="col">Players</th><th scope="col">Recordings</th><th scope="col">Imports</th></tr></thead><tbody>{[...daily].reverse().map(d => <tr key={d.day}><td>{day(d.day)}</td><td>{number(d.players)}</td><td>{number(d.recordings)}</td><td>{number(d.imports)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

function Breakdown({ title, subtitle, rows }: { title: string; subtitle: string; rows: { label: string; value: number }[] }) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...rows.map(r => r.value));
  return <div className="analytics-breakdown"><h2>{title}</h2><p>{subtitle}</p>{!rows.length ? <p className="analytics-no-data">No sessions in this period.</p> :
    <ul>{(expanded ? rows : rows.slice(0, 5)).map(r => <li key={r.label}><div><span>{r.label}</span><strong>{number(r.value)}</strong></div><div className="analytics-meter"><span style={{ width: `${r.value / max * 100}%` }} /></div></li>)}</ul>}
    {rows.length > 5 && <button className="analytics-expand" onClick={() => setExpanded(v => !v)}>{expanded ? 'Show fewer' : `Show all ${rows.length}`}</button>}
  </div>;
}

function Player({ name, id, countryCode, onClick }: { name: string; id: string; countryCode?: string | null; onClick: () => void }) {
  return <button className="admin-player analytics-player-link" onClick={e => { e.stopPropagation(); onClick(); }} aria-label={`View ${name} account`}><span className="admin-player-initial" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><small title={id}>{id.slice(0, 8)}{countryCode ? ` · ${countryCode}` : ''}</small></div></button>;
}

function Records({ data, onOpen }: { data: Analytics; onOpen: (userId: string, sessionId?: string) => void }) {
  const headings = data.list === 'sessions' ? ['Player', 'Completed · Germany', 'Touches', 'Clip length', 'Source', 'App version']
    : data.list === 'players' ? ['Player', 'Sessions', 'Active days', 'Total touches', 'Last session · Germany']
      : data.list === 'accounts' ? ['Player', 'Joined · Germany', 'All synced sessions', 'Last session · Germany']
        : ['Player', 'Plan', 'Access', 'Valid until · Germany', 'Last verified · Germany'];
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}<th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>
    {data.list === 'sessions' && data.rows.map(s => <tr key={`${s.user_id}/${s.id}`} className="analytics-clickable-row" onClick={() => onOpen(s.user_id, s.id)}><td><Player onClick={() => onOpen(s.user_id)} name={s.player} id={s.user_id} countryCode={s.country} /></td><td>{time(s.completed_at)}<small title={s.id}>Synced {time(s.received_at)}</small></td><td><strong className="analytics-cell-number">{number(s.touch_count)}</strong></td><td>{duration(s.duration_ms / 1000)}</td><td><span className={`analytics-source ${s.source}`}>{s.source === 'recording' ? 'Recording' : 'Import'}</span></td><td>{s.app_version}</td><td><button className="admin-row-action" onClick={() => onOpen(s.user_id, s.id)}>View session →</button></td></tr>)}
    {data.list === 'players' && data.rows.map(p => <tr key={p.user_id} className="analytics-clickable-row" onClick={() => onOpen(p.user_id)}><td><Player onClick={() => onOpen(p.user_id)} name={p.player} id={p.user_id} countryCode={p.country} /></td><td><strong className="analytics-cell-number">{number(p.sessions)}</strong></td><td>{p.active_days} {p.active_days >= 2 && <span className="analytics-source recording">Returning</span>}</td><td>{number(p.touches)}</td><td>{time(p.last_session)}</td><td><button className="admin-row-action" onClick={() => onOpen(p.user_id)}>View player →</button></td></tr>)}
    {data.list === 'accounts' && data.rows.map(a => <tr key={a.user_id} className="analytics-clickable-row" onClick={() => onOpen(a.user_id)}><td><Player onClick={() => onOpen(a.user_id)} name={a.player} id={a.user_id} countryCode={a.country} /></td><td>{time(a.created_at)}</td><td>{number(a.sessions)}</td><td>{time(a.last_session)}</td><td><button className="admin-row-action" onClick={() => onOpen(a.user_id)}>View account →</button></td></tr>)}
    {data.list === 'pro' && data.rows.map(p => <tr key={p.user_id} className="analytics-clickable-row" onClick={() => onOpen(p.user_id)}><td><Player onClick={() => onOpen(p.user_id)} name={p.player} id={p.user_id} /></td><td>{p.product_id.endsWith('.yearly') ? 'Yearly' : 'Monthly'}</td><td><span className={`analytics-source ${p.status === 1 ? 'recording' : 'gallery'}`}>{p.status === 1 ? 'Active' : 'Grace period'}</span></td><td>{time(p.access_until)}</td><td>{time(p.updated_at)}</td><td><button className="admin-row-action" onClick={() => onOpen(p.user_id)}>View Pro details →</button></td></tr>)}
  </tbody></table></div>;
}
