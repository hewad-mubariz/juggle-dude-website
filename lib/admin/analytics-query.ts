import { queryOptions } from '@tanstack/react-query';
import { api } from './client';
import type { Analytics, AnalyticsCohort, AnalyticsDays, AnalyticsList, AnalyticsSource } from './analytics';

export function analyticsQuery(days: AnalyticsDays, source: AnalyticsSource, list: AnalyticsList, offset: number, cohort: AnalyticsCohort = 'exclude_invites') {
  return queryOptions({
    queryKey: ['admin-analytics', days, source, list, offset, cohort] as const,
    queryFn: ({ signal }) => api<Analytics>(`analytics?days=${days}&source=${source}&list=${list}&offset=${offset}&cohort=${cohort}`, undefined, signal),
    staleTime: 60000,
  });
}
