'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '@/lib/admin/client';
import type { PlayerDetail, PlayerSession } from '@/lib/admin/analytics';
import { country, duration, number, plan, time } from '@/lib/admin/analytics-format';
import { LeaderboardStatus } from './leaderboard-status';

export function PlayerDetails({ userId, sessionId, onClose }: { userId: string; sessionId?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const sessionHeading = useRef<HTMLHeadingElement>(null);
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<PlayerSession | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-player-detail', userId, sessionId, offset],
    queryFn: ({ signal }) => api<PlayerDetail>(`analytics/players/${userId}?offset=${offset}${sessionId ? `&session=${sessionId}` : ''}`, undefined, signal),
    staleTime: 30000,
    placeholderData: previous => previous?.profile.user_id === userId ? previous : undefined,
  });
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    if (query.error instanceof RequestError && [401, 403].includes(query.error.status)) void cache.invalidateQueries({ queryKey: ['admin-session'] });
  }, [query.error, cache]);
  const unavailable = query.error instanceof RequestError && [401, 403, 404].includes(query.error.status);
  const data = unavailable ? undefined : query.data;
  const selected = picked ?? data?.selected_session;
  function page(next: number) { setOffset(next); history.current?.scrollTo({ top: 0 }); }
  function select(session: PlayerSession) {
    setPicked(session);
    requestAnimationFrame(() => sessionHeading.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  return <dialog ref={dialog} className="analytics-detail-dialog" aria-labelledby="analytics-player-title" onClose={onClose}
    onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose(); } }}>
    <header className="analytics-detail-header"><div><p className="admin-kicker">PLAYER DETAILS</p><h2 id="analytics-player-title">{data?.profile.player || 'Account details'}</h2><p>Account, Pro and synced juggling history</p></div>
      <button autoFocus className="admin-icon-btn" aria-label="Close player details" onClick={onClose}>✕</button>
    </header>
    <div className="analytics-detail-body">
      {query.error && <div className="admin-notice" role="alert">{query.error.message} <button onClick={() => void query.refetch()}>Retry details</button></div>}
      {!data ? <p className="admin-empty" role="status">{query.error ? 'Account details are unavailable.' : 'Loading account details…'}</p> : <>
        <section className="analytics-detail-section" aria-label="Account information">
          <div className="analytics-detail-title"><h3>Account</h3><span className={`analytics-source ${data.pro.active ? 'recording' : 'gallery'}`}>{data.pro.active ? 'Linked Pro · Active' : 'No active linked Pro'}</span></div>
          <dl className="analytics-fields">
            <Field label="Email">{data.profile.email || 'Not available'}</Field>
            <Field label="Profile country">{country(data.profile.country)}</Field>
            <Field label="Joined">{time(data.profile.created_at)}</Field>
            <Field label="Last account sign-in">{time(data.profile.last_sign_in_at, 'Not available')}</Field>
            <Field label="User ID"><code>{data.profile.user_id}</code></Field>
            <Field label="Latest session app version">{data.summary.latest_app_version || 'No synced session'}</Field>
            <Field label="Leaderboard participation"><LeaderboardStatus joined={data.profile.leaderboard_visible} /></Field>
          </dl>
          <p className="analytics-detail-note">Email can be an Apple private relay address. Account sign-in is not a measure of app usage. All times are German time.</p>
          <p className="analytics-detail-note">Leaderboard participation is the current profile setting. A joined player appears in the rankings once they have a qualifying recorded streak. A join date is not stored.</p>
        </section>
        <section className="analytics-detail-section" aria-label="Player lifetime activity">
          <h3>Lifetime activity</h3><p className="analytics-detail-note">All saved dates and sources, independent of the dashboard filters. Device-reported counts; videos stay on the player’s device.</p>
          <div className="analytics-player-stats">
            <div><strong>{number(data.summary.sessions)}</strong><span>Synced sessions</span></div>
            <div><strong>{number(data.summary.active_days)}</strong><span>Active days</span></div>
            <div><strong>{number(data.summary.touches)}</strong><span>Total touches</span></div>
            <div><strong>{data.summary.most_touches === null ? '—' : number(data.summary.most_touches)}</strong><span>Most touches in a session</span></div>
          </div>
          <dl className="analytics-fields">
            <Field label="Recordings / imports">{number(data.summary.recordings)} / {number(data.summary.imports)}</Field>
            <Field label="Average clip length">{data.summary.sessions ? duration(data.summary.average_duration_seconds) : '—'}</Field>
            <Field label="First session">{time(data.summary.first_session)}</Field><Field label="Last session">{time(data.summary.last_session)}</Field>
          </dl>
        </section>
        <section className="analytics-detail-section" aria-label="Linked subscription details">
          <h3>Linked Pro</h3><p className="analytics-detail-note">Production only, based on stored Apple verification. Sandbox and unlinked guest purchases are excluded. Access does not prove a paid sale or that renewal is enabled.</p>
          {!data.pro.subscriptions.length ? <p className="analytics-detail-note">No production subscription is linked to this account.</p> : data.pro.subscriptions.map((subscription, index) => <div className="analytics-subscription" key={index}>
            <div className="analytics-detail-title"><h4>Juggle Dude Pro · {plan(subscription.product_id)}</h4><span className={`analytics-source ${subscription.has_access ? 'recording' : 'gallery'}`}>{subscription.has_access ? subscription.status === 4 ? 'Grace period' : 'Active access' : 'No current access'}</span></div>
            <dl className="analytics-fields">
              <Field label="Latest Apple status">{({ 1: 'Active', 2: 'Expired', 3: 'Billing retry', 4: 'Grace period', 5: 'Revoked' } as Record<number, string>)[subscription.status] || 'Unknown'}</Field>
              <Field label="Access until">{time(subscription.access_until)}</Field>
              <Field label="Last verified">{time(subscription.updated_at)}</Field><Field label="Product ID"><code>{subscription.product_id}</code></Field>
            </dl>
          </div>)}
          {data.pro.total > data.pro.subscriptions.length && <p className="analytics-detail-note">Showing the latest {data.pro.subscriptions.length} of {data.pro.total} linked subscription records.</p>}
        </section>
        <section className="analytics-detail-section" aria-label="Session details">
          <h3 ref={sessionHeading} tabIndex={-1}>Session details</h3>
          {selected ? <SessionDetails session={selected} /> : <p className="analytics-detail-note">{sessionId ? 'The requested session is no longer available. Select another session below.' : 'Select a session below to inspect its count, duration, source and counter version.'}</p>}
        </section>
        <section className="analytics-detail-section" aria-label="Player session history">
          <div className="analytics-detail-title"><h3>Session history <span>{number(data.summary.sessions)}</span></h3><span className="analytics-table-status" role="status">{query.isFetching ? 'Updating…' : 'All dates · all sources'}</span></div>
          <div ref={history} className="admin-table-wrap analytics-history" aria-busy={query.isFetching}>
            {!data.sessions.length ? <p className="admin-empty">{offset ? 'No more sessions.' : 'This account has no synced sessions.'}</p> : <table className="admin-table"><thead><tr><th scope="col">Completed</th><th scope="col">Touches</th><th scope="col">Length</th><th scope="col">Source</th><th scope="col">Details</th></tr></thead><tbody>{data.sessions.map(s => <tr key={s.id} className={`analytics-clickable-row ${selected?.id === s.id ? 'analytics-selected-row' : ''}`} onClick={() => select(s)}><td>{time(s.completed_at)}</td><td>{number(s.touch_count)}</td><td>{duration(s.duration_ms / 1000)}</td><td>{s.source === 'recording' ? 'Recording' : 'Import'}</td><td><button className="admin-row-action" onClick={() => select(s)} aria-label={`View session ${s.id}`}>View →</button></td></tr>)}</tbody></table>}
          </div>
          <footer className="admin-pagination"><span>{data.sessions.length ? `${number(data.offset + 1)}–${number(data.offset + data.sessions.length)} of ${number(data.summary.sessions)}` : '0 shown'}</span><div>
            <button disabled={offset === 0 || query.isFetching || query.isPlaceholderData} onClick={() => page(Math.max(0, offset - 25))}>← Previous</button>
            <button disabled={offset + 25 >= data.summary.sessions || offset >= 100000 || query.isFetching || query.isPlaceholderData} onClick={() => page(offset + 25)}>Next →</button>
          </div></footer>
        </section>
      </>}
    </div>
  </dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function SessionDetails({ session: s }: { session: PlayerSession }) {
  return <dl className="analytics-fields analytics-session-fields">
    <Field label="Touch count">{number(s.touch_count)}</Field><Field label="Clip length">{duration(s.duration_ms / 1000)}</Field>
    <Field label="Source">{s.source === 'recording' ? 'Camera recording' : 'Video import'}</Field>
    <Field label="Score status">{({ device_reported: 'Device reported', verified: 'Verified', rejected: 'Rejected' } as Record<string, string>)[s.score_status] || s.score_status}</Field>
    <Field label="Completed">{time(s.completed_at)}</Field><Field label="Synced">{time(s.received_at)}</Field>
    <Field label="App version">{s.app_version}</Field><Field label="Counter version">{s.counter_version}</Field>
    <Field label="Device streak">{s.streak_touches === null ? 'Not recorded' : `${number(s.streak_touches)} touches`}</Field>
    <Field label="Streak in clip">{s.streak_start_ms === null || s.streak_end_ms === null ? 'Not recorded' : `${(s.streak_start_ms / 1000).toFixed(2)}s – ${(s.streak_end_ms / 1000).toFixed(2)}s`}</Field>
    <Field label="Session ID"><code>{s.id}</code></Field>
  </dl>;
}
