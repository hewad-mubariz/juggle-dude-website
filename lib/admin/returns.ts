import type { AnalyticsCohort, AnalyticsPlayer } from './analytics';
export type ReturnGroup = 'returned' | 'not_returned' | 'no_sessions';
export type ReturnPlayer = AnalyticsPlayer & {
 created_at: string; sessions: number; active_days: number;
 first_session: string | null; last_session: string | null;
 days_since_last: number | null; first_day_today: boolean; return_group: ReturnGroup;
};
export type PlayerReturns = {
 generated_at: string; timezone: string; cohort: AnalyticsCohort; group: ReturnGroup; offset: number;
 summary: { accounts: number; returned: number; not_returned: number; no_sessions: number; first_day_today: number };
 total: number; rows: ReturnPlayer[];
};
