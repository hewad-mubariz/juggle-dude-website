import 'server-only';
import { AdminError, rpc, supabase } from './server';
import { idSchema } from './validation';
import type { AdminLeaderboard, LeaderboardPeriod, PublicLeaderboard } from './leaderboard';

// Called only after requireSession in the admin route. Batch the current opt-in
// flags for one page rather than fetching a profile for every displayed row.
export async function participation(userIds: string[]): Promise<Map<string, boolean>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  if (ids.length > 25 || ids.some(id => !idSchema.safeParse(id).success)) throw new AdminError(502, 'Player information could not be loaded.');
  const params = new URLSearchParams({ select: 'id,leaderboard_visible', id: `in.(${ids.join(',')})`, deletion_requested_at: 'is.null' });
  const response = await supabase('/rest/v1/profiles?' + params);
  const rows: { id: string; leaderboard_visible: boolean }[] = await response.json();
  return new Map(rows.map(row => [row.id, row.leaderboard_visible]));
}

export async function leaderboard(period: LeaderboardPeriod): Promise<AdminLeaderboard> {
  const limit = 100;
  const [board, joined] = await Promise.all([
    rpc<PublicLeaderboard>('reviewed_juggling_leaderboard', { p_period: period, p_country: null, p_limit: limit }),
    supabase('/rest/v1/profiles?select=id&leaderboard_visible=eq.true&deletion_requested_at=is.null', {
      method: 'HEAD', headers: { Prefer: 'count=exact' },
    }),
  ]);
  const count = joined.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  if (count === undefined || !Number.isSafeInteger(Number(count))) throw new AdminError(502, 'Leaderboard participation could not be loaded.');
  // Use the same ranking RPC as the iOS app and expose only the display fields.
  return { generated_at: new Date().toISOString(), period, limit, joined_players: Number(count),
    total_players: board.total_players, week_starts_at: board.week_starts_at,
    entries: board.entries.map(({ rank, user_id, display_name, country_code, touches, streak_duration_ms, achieved_at }) =>
      ({ rank, user_id, display_name, country_code, touches, streak_duration_ms, achieved_at })),
  };
}
