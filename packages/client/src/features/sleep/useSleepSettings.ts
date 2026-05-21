import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/axios'
import type { ApiResponse, SleepSettings } from '@tracker/shared'

export function useSleepSettings(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['sleepSettings', babyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SleepSettings>>(`/api/settings/sleep?babyId=${babyId}`)
      return res.data.data!
    },
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<SleepSettings>) =>
      api.patch<ApiResponse<SleepSettings>>(`/api/settings/sleep?babyId=${babyId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepSettings', babyId] })
    },
  })

  return {
    settings: query.data ?? { napIdealMinutes: 45, nightIdealMinutes: 180, wakeWindowMaxMinutes: 120 },
    isLoading: query.isLoading,
    updateMutation,
  }
}
