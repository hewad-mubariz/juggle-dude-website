import { queryOptions } from '@tanstack/react-query';
import { api } from './client';
import type { Analytics, AnalyticsDays, AnalyticsList, AnalyticsSource } from './analytics';

export function analyticsQuery(days: AnalyticsDays, source: AnalyticsSource, list: AnalyticsList, offset: number) {
  return queryOptions({
    queryKey: ['admin-analytics', days, source, list, offset] as const,
    queryFn: ({ signal }) => api<Analytics>(`analytics?days=${days}&source=${source}&list=${list}&offset=${offset}`, undefined, signal),
    staleTime: 60000,
  });
}
