'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '@/lib/admin/client';
import { analyticsDays } from '@/lib/admin/analytics';
import type { Analytics, AnalyticsDaily, AnalyticsDays, AnalyticsList, AnalyticsSource } from '@/lib/admin/analytics';
import './analytics.css';

const number = (n: number) => new Intl.NumberFormat('en-GB').format(n);
const time = (s: string | null) => s ? new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(s)) : 'No synced session';
const day = (s: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(s + 'T12:00:00Z'));
const countries = new Intl.DisplayNames(['en'], { type: 'region' });
const country = (code: string | null) => code ? countries.of(code) || code : 'Not provided';
const duration = (seconds: number) => seconds < 60 ? `${seconds.toFixed(0)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
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
  const query = useQuery({
    queryKey: ['admin-analytics', days, source, list, offset],
    queryFn: () => api<Analytics>(`analytics?days=${days}&source=${source}&list=${list}&offset=${offset}`),
    staleTime: 30000,
  });
  useEffect(() => {
    if (query.error instanceof RequestError && [401, 403].includes(query.error.status)) {
      void cache.invalidateQueries({ queryKey: ['admin-session'] });
    }
  }, [query.error, cache]);
  const data = query.data;
  return <div className="analytics-panel">
    <div className="admin-page-heading analytics-heading">
      <div><p className="admin-kicker">THE BIG PICTURE</p><h1>In play<span>.</span></h1><p>See who’s playing, coming back and making it Pro.</p></div>
      <button className="admin-btn secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
        <span aria-hidden="true">↻</span>{query.isFetching ? 'Refreshing…' : 'Refresh analytics'}
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
    {query.error ? <div role="alert" className="admin-notice">Analytics couldn’t load. {query.error.message} <button onClick={() => void query.refetch()}>Retry analytics</button></div>
      : query.isPending || !data ? <div className="analytics-loading" role="status">Loading your activity…</div>
      : <>
        <section className="admin-stats analytics-stats" aria-label="Analytics overview">
          <Stat label="Active players" value={data.summary.players} note={`${number(data.summary.returning_players)} played on 2+ days`} highlight />
          <Stat label="Synced sessions" value={data.summary.sessions} note={`${number(data.summary.recordings)} recorded · ${number(data.summary.imports)} imported`} />
          <Stat label="New accounts" value={data.summary.new_accounts} note={`${number(data.summary.new_accounts_with_sessions)} have a synced session · all sources`} />
          <Stat label="Linked Pro accounts" value={data.summary.pro_accounts} note="Current production access · all dates" />
        </section>
        <div className="analytics-grid">
          <Activity daily={data.daily} average={data.summary.average_duration_seconds} />
          <section className="analytics-card analytics-breakdowns" aria-label="Player breakdowns">
            <Breakdown title="App versions" subtitle="Latest session per active player" rows={data.versions.map(v => ({ label: v.app_version, value: v.players }))} />
            <Breakdown title="Player countries" subtitle="Optional profile country, not device location" rows={data.countries.map(c => ({ label: country(c.country), value: c.players }))} />
          </section>
        </div>
        <section className="admin-queue analytics-table-section" aria-label="Activity details">
          <div className="admin-tabs analytics-tabs" role="group" aria-label="Analytics details">
            {tabs.map(tab => <button key={tab.id} aria-pressed={list === tab.id} className={list === tab.id ? 'active' : ''} onClick={() => { setList(tab.id); setOffset(0); }}>{tab.label}</button>)}
          </div>
          <div className="admin-queue-header"><div><h2>{tabs.find(t => t.id === list)?.label} <span>{number(data.total)}</span></h2><p>{tabs.find(t => t.id === list)?.help}</p></div></div>
          {list === 'pro' && <p className="analytics-pro-note">Access is based on the latest stored Apple verification. Promotional access can be included. These are entitlements, not paid sales or revenue; use App Store Connect for sales.</p>}
          {!data.rows.length ? <div className="admin-empty"><h3>{offset ? 'No more results.' : 'No matching records yet.'}</h3><p>{list === 'pro' ? 'Linked production Pro accounts will appear here after verification.' : 'Try a longer period or another session source.'}</p></div>
            : <Records data={data} />}
          <footer className="admin-pagination"><span>{data.total && data.rows.length ? `${number(offset + 1)}–${number(Math.min(offset + 25, data.total))} of ${number(data.total)}` : `0 shown · ${number(data.total)} total`}</span><div>
            <button disabled={offset === 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - 25))}>← Previous</button>
            <button disabled={offset + 25 >= data.total || offset >= 100000 || query.isFetching} onClick={() => setOffset(offset + 25)}>Next →</button>
          </div></footer>
        </section>
        <p className="admin-bottom-note">Session source affects activity, players and breakdowns. New accounts use all sources; Pro is a current snapshot. No player records are changed here.</p>
      </>}
  </div>;
}

function Stat({ label, value, note, highlight = false }: { label: string; value: number; note: string; highlight?: boolean }) {
  return <div className={`admin-stat ${highlight ? 'lime' : ''}`}><span>{label}</span><strong>{number(value)}</strong><small>{note}</small></div>;
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

function Player({ name, id, countryCode }: { name: string; id: string; countryCode?: string | null }) {
  return <div className="admin-player"><span className="admin-player-initial" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><small title={id}>{id.slice(0, 8)}{countryCode ? ` · ${countryCode}` : ''}</small></div></div>;
}

function Records({ data }: { data: Analytics }) {
  const headings = data.list === 'sessions' ? ['Player', 'Completed · Germany', 'Touches', 'Clip length', 'Source', 'App version']
    : data.list === 'players' ? ['Player', 'Sessions', 'Active days', 'Total touches', 'Last session · Germany']
      : data.list === 'accounts' ? ['Player', 'Joined · Germany', 'All synced sessions', 'Last session · Germany']
        : ['Player', 'Plan', 'Access', 'Valid until · Germany', 'Last verified · Germany'];
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
    {data.list === 'sessions' && data.rows.map(s => <tr key={`${s.user_id}/${s.id}`}><td><Player name={s.player} id={s.user_id} countryCode={s.country} /></td><td>{time(s.completed_at)}<small title={s.id}>Synced {time(s.received_at)}</small></td><td><strong className="analytics-cell-number">{number(s.touch_count)}</strong></td><td>{duration(s.duration_ms / 1000)}</td><td><span className={`analytics-source ${s.source}`}>{s.source === 'recording' ? 'Recording' : 'Import'}</span></td><td>{s.app_version}</td></tr>)}
    {data.list === 'players' && data.rows.map(p => <tr key={p.user_id}><td><Player name={p.player} id={p.user_id} countryCode={p.country} /></td><td><strong className="analytics-cell-number">{number(p.sessions)}</strong></td><td>{p.active_days} {p.active_days >= 2 && <span className="analytics-source recording">Returning</span>}</td><td>{number(p.touches)}</td><td>{time(p.last_session)}</td></tr>)}
    {data.list === 'accounts' && data.rows.map(a => <tr key={a.user_id}><td><Player name={a.player} id={a.user_id} countryCode={a.country} /></td><td>{time(a.created_at)}</td><td>{number(a.sessions)}</td><td>{time(a.last_session)}</td></tr>)}
    {data.list === 'pro' && data.rows.map(p => <tr key={p.user_id}><td><Player name={p.player} id={p.user_id} /></td><td>{p.product_id.endsWith('.yearly') ? 'Yearly' : 'Monthly'}</td><td><span className={`analytics-source ${p.status === 1 ? 'recording' : 'gallery'}`}>{p.status === 1 ? 'Active' : 'Grace period'}</span></td><td>{time(p.access_until)}</td><td>{time(p.updated_at)}</td></tr>)}
  </tbody></table></div>;
}
