import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationSettingsDTO, UpdateNotificationSettingsInput } from '@tracker/shared'
import { NOTIFICATION_SETTINGS_DEFAULTS } from '@tracker/shared'
import { api } from '@lib/axios'

export const notificationSettingsKey = (babyId: string) => ['notificationSettings', babyId] as const

export function useNotificationSettings(babyId: string | null) {
  return useQuery({
    queryKey: notificationSettingsKey(babyId ?? ''),
    enabled: !!babyId,
    queryFn: () =>
      api
        .get<{ data: NotificationSettingsDTO; error: null }>(
          `/api/settings/notifications?babyId=${babyId}`,
        )
        .then((r) => r.data.data),
  })
}

export function useUpdateNotificationSettings(babyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdateNotificationSettingsInput) =>
      api
        .patch<{ data: NotificationSettingsDTO; error: null }>(
          `/api/settings/notifications?babyId=${babyId}`,
          patch,
        )
        .then((r) => r.data.data),
    // Optimistic update — settings toggles should feel instant
    onMutate: async (patch) => {
      const key = notificationSettingsKey(babyId ?? '')
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationSettingsDTO>(key)
      queryClient.setQueryData<NotificationSettingsDTO>(key, (old) => ({
        ...(old ?? NOTIFICATION_SETTINGS_DEFAULTS),
        ...patch,
      }))
      return { previous }
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationSettingsKey(babyId ?? ''), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKey(babyId ?? '') })
    },
  })
}
