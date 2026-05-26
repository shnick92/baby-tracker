import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@stores/authStore'
import { fetchWeeklySummaries } from './api'
import { aiKeys } from './queryKeys'

export function useWeeklySummaries(babyId: string | null) {
  const birthDate = useAuthStore((s) => s.birthDate)
  return useQuery({
    queryKey: aiKeys.weeklySummaries(babyId ?? ''),
    queryFn: () => fetchWeeklySummaries(babyId!),
    enabled: !!babyId && !!birthDate,
    staleTime: 30 * 60 * 1000,
  })
}
