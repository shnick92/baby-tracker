import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/axios'
import type { EmergencyAlert } from '@tracker/shared'

type AlertsResponse = { alerts: EmergencyAlert[] }

export function useAlerts(babyId: string | null) {
  return useQuery({
    queryKey: ['alerts', babyId],
    queryFn: () =>
      api
        .get<{ data: AlertsResponse; error: null }>(`/api/alerts?babyId=${babyId}`)
        .then((r) => r.data.data.alerts),
    enabled: !!babyId,
    staleTime: 30_000,
  })
}

type SosPayload = { babyId: string; message?: string }
type SosResponse = { alert: EmergencyAlert }

export function useSendSos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SosPayload) =>
      api
        .post<{ data: SosResponse; error: null }>('/api/alerts/sos', payload)
        .then((r) => r.data.data.alert),
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', alert.babyId] })
    },
  })
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (alertId: string) =>
      api
        .patch<{ data: SosResponse; error: null }>(`/api/alerts/${alertId}/acknowledge`)
        .then((r) => r.data.data.alert),
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', alert.babyId] })
    },
  })
}
