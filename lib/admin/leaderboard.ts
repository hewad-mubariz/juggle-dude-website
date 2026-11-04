export type LeaderboardPeriod = 'week' | 'all_time';
export type LeaderboardEntry = {
  rank: number; user_id: string; display_name: string; country_code: string | null;
  touches: number; streak_duration_ms: number | null; achieved_at: string;
};
export type PublicLeaderboard = {
  entries: LeaderboardEntry[]; total_players: number; week_starts_at: string;
};
export type AdminLeaderboard = PublicLeaderboard & {
  generated_at: string; period: LeaderboardPeriod; joined_players: number; limit: number;
};
