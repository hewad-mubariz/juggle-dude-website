export const momentKinds = ['handContact', 'heldBall', 'groundContact', 'lowContactUncertain', 'handsUncertain', 'bodyUncertain', 'playerUncertain', 'ballUncertain', 'continuityGap'] as const;
export type Moment = { kind: typeof momentKinds[number]; timeMS: number; lastTimeMS: number; clipStartMS: number; clipEndMS: number };
export type Choice = { id: string; decision: 'confirm' | 'reject' };
export type Attempt = {
  id: string; user_id: string; session_id: string; status: 'pending' | 'approved' | 'rejected' | 'uploading' | 'withdrawn';
  submitted_at: string | null; reviewed_at: string | null; created_at: string;
  proposed_count: number; proposed_start_ms: number; proposed_end_ms: number; duration_ms: number;
  reviewed_count: number | null; reviewed_start_ms: number | null; reviewed_end_ms: number | null;
  review_reason: string | null; appeal_text: string | null;
  video_delete_requested_at: string | null; video_deleted_at: string | null;
  touch_review: { version: number; durationMS: number; complete: boolean; moments: Moment[] } | null;
  player_name: string; device_count: number | null; device_start_ms: number | null; device_end_ms: number | null;
};
export type ReviewDetail = { attempt: Attempt; previous: { choices: Choice[]; reason: string; created_at: string } | null };
export type Queue = { items: Attempt[]; total: number; pending: number; approved: number; rejected: number };
export type FinishInput = { requestId: string; choices: Choice[]; count: number | null; startMS: number | null; endMS: number | null; reason: string; watched: boolean };
export const momentID = (m: Moment) => `${m.kind}-${m.timeMS}`;
export const momentTitle: Record<Moment['kind'], string> = {
  handContact: 'Hand or arm contact', heldBall: 'Ball hold', groundContact: 'Ground contact',
  lowContactUncertain: 'Unclear foot contact', handsUncertain: 'Unclear hand position', bodyUncertain: 'Unclear body contact',
  playerUncertain: 'Player out of view', ballUncertain: 'Ball tracking interrupted', continuityGap: 'Gap between touches',
};
export function timestamp(ms: number) {
  return `${Math.floor(ms / 60000)}:${((ms / 1000) % 60).toFixed(2).padStart(5, '0')}`;
}
// The app joins overlapping recording windows into one compact uploaded video.
// Review timestamps refer to the recording, not to that compact video's timeline.
export function clipWindows(a: Pick<Attempt, 'duration_ms' | 'touch_review' | 'proposed_start_ms' | 'proposed_end_ms'>) {
  const raw = a.touch_review?.moments.length ? a.touch_review.moments.map(m => [m.clipStartMS, m.clipEndMS]) :
    [[a.proposed_start_ms - 1000, a.proposed_start_ms + 1200], [a.proposed_end_ms - 1200, a.proposed_end_ms + 1000]];
  const merged: { from: number; to: number; offset: number }[] = [];
  for (const [from, to] of raw.map(([s,e]) => [Math.max(0, Math.min(s,a.duration_ms)), Math.max(0, Math.min(e,a.duration_ms))]).filter(([s,e]) => e>s).sort((a,b)=>a[0]-b[0])) {
    const last = merged.at(-1);
    if (last && from <= last.to) last.to = Math.max(last.to,to);
    else merged.push({from,to,offset:0});
  }
  let offset = 0;
  for (const w of merged) { w.offset = offset; offset += w.to-w.from; }
  return merged;
}
export function momentClip(a: Attempt, m: Moment, mediaDuration: number) {
  // Legacy requests uploaded the whole recording. Identify that format by duration.
  const windows = clipWindows(a), compact = windows.reduce((n,w)=>n+w.to-w.from,0);
  const isCompact = Math.abs(mediaDuration*1000-compact) <= 250*(windows.length+1);
  const w = windows.find(w => m.timeMS >= w.from && m.timeMS <= w.to);
  const offset = isCompact && w ? w.offset-w.from : 0;
  return { start: Math.max(0,(m.clipStartMS+offset)/1000), end: (m.clipEndMS+offset)/1000, contact: (m.timeMS+offset)/1000 };
}
