import { useQuery, useQueryClient } from '@tanstack/react-query'
import { INSIGHTS_MIN_FEEDINGS, INSIGHTS_MIN_SLEEPS } from '@tracker/shared'

import { useAuthStore } from '@stores/authStore'
import { feedingKeys } from '@features/feeding'
import { sleepKeys } from '@features/sleep'
import { fetchInsights } from './api'
import { aiKeys } from './queryKeys'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function useInsights(babyId: string | null) {
  const birthDate = useAuthStore((s) => s.birthDate)
  const queryClient = useQueryClient()

  const feedings: Array<{ startedAt: string }> =
    queryClient.getQueryData(feedingKeys.list(babyId ?? '')) ?? []
  const sleeps: Array<{ startedAt: string; endedAt?: string | null }> =
    queryClient.getQueryData(sleepKeys.list(babyId ?? '')) ?? []

  const cutoff = Date.now() - SEVEN_DAYS_MS
  const recentFeedings = feedings.filter((f) => new Date(f.startedAt).getTime() >= cutoff).length
  const recentSleeps = sleeps.filter(
    (s) => s.endedAt != null && new Date(s.startedAt).getTime() >= cutoff,
  ).length
  const hasEnoughData =
    recentFeedings >= INSIGHTS_MIN_FEEDINGS && recentSleeps >= INSIGHTS_MIN_SLEEPS

  return useQuery({
    queryKey: aiKeys.insights(babyId ?? ''),
    queryFn: () => fetchInsights(babyId!),
    enabled: !!babyId && !!birthDate && hasEnoughData,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
  })
}
