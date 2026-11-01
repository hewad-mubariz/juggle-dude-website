export const analyticsDays = [7, 30, 90] as const;
export type AnalyticsDays = typeof analyticsDays[number];
export type AnalyticsSource = 'all' | 'recording' | 'gallery';
export type AnalyticsList = 'sessions' | 'players' | 'accounts' | 'pro';
export type AnalyticsPlayer = { user_id: string; player: string; country: string | null };
export type AnalyticsSession = AnalyticsPlayer & {
  id: string; completed_at: string; received_at: string; touch_count: number;
  duration_ms: number; source: 'recording' | 'gallery'; app_version: string;
};
export type ActivePlayer = AnalyticsPlayer & { sessions: number; active_days: number; touches: number; last_session: string };
export type NewAccount = AnalyticsPlayer & { created_at: string; sessions: number; last_session: string | null };
export type ProAccount = { user_id: string; player: string; product_id: string; status: 1 | 4; access_until: string; updated_at: string };
export type AnalyticsDaily = { day: string; sessions: number; players: number; recordings: number; imports: number };
export type Analytics = {
  generated_at: string; starts_at: string; timezone: string; days: AnalyticsDays; source: AnalyticsSource; offset: number; total: number;
  summary: { players: number; sessions: number; recordings: number; imports: number; returning_players: number;
    average_duration_seconds: number; new_accounts: number; new_accounts_with_sessions: number; pro_accounts: number };
  daily: AnalyticsDaily[];
  versions: { app_version: string; players: number }[];
  countries: { country: string | null; players: number }[];
} & ({ list: 'sessions'; rows: AnalyticsSession[] } | { list: 'players'; rows: ActivePlayer[] }
  | { list: 'accounts'; rows: NewAccount[] } | { list: 'pro'; rows: ProAccount[] });
