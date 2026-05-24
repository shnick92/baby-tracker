import { useQuery } from '@tanstack/react-query'

import { api } from '@lib/axios'

import { historyKeys } from './queryKeys'

export type DailyLog = {
  feedings: {
    id: string; type: string; startedAt: string; endedAt: string | null
    durationSec: number | null; volumeOz: number | null; milkType: string | null; formulaName: string | null; notes: string | null
  }[]
  sleeps: {
    id: string; type: string; startedAt: string; endedAt: string | null; notes: string | null
  }[]
  diapers: {
    id: string; type: string; color: string | null; occurredAt: string; notes: string | null
  }[]
  medications: {
    id: string; name: string; dosageNote: string | null; givenAt: string; notes: string | null
  }[]
  tummyTimes: {
    id: string; startedAt: string; durationSec: number | null; notes: string | null
  }[]
  moods: {
    id: string; mood: string | null; occurredAt: string; customActivity: { name: string; emoji: string } | null
  }[]
}

export type WeeklySummary = {
  feeding: {
    totalFeeds: number
    avgFeedsPerDay: number
    breastFeedCount: number
    avgBreastDurationSec: number
    totalVolumeOz: number
  }
  sleep: {
    totalSleepSec: number
    avgSleepPerDaySec: number
    longestStretchSec: number
    sessionCount: number
  }
  diaperByDay: Record<string, { wet: number; dirty: number; both: number }>
}

export function useDailyHistory(babyId: string, date: string) {
  return useQuery({
    queryKey: historyKeys.daily(babyId, date),
    queryFn: () =>
      api
        .get<{ data: DailyLog; error: null }>(`/api/history/daily?babyId=${babyId}&date=${date}`)
        .then((r) => r.data.data),
    staleTime: 60_000,
  })
}

export function useWeeklyHistory(babyId: string) {
  return useQuery({
    queryKey: historyKeys.weekly(babyId),
    queryFn: () =>
      api
        .get<{ data: WeeklySummary; error: null }>(`/api/history/weekly?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
  })
}
