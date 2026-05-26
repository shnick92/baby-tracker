import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@stores/authStore'
import { fetchInsights } from './api'
import { aiKeys } from './queryKeys'

export function useInsights(babyId: string | null) {
  const birthDate = useAuthStore((s) => s.birthDate)
  return useQuery({
    queryKey: aiKeys.insights(babyId ?? ''),
    queryFn: () => fetchInsights(babyId!),
    enabled: !!babyId && !!birthDate,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
  })
}
