import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'

import { contractionKeys } from './queryKeys'

export type ContractionLog = {
  id: string
  babyId: string
  loggedById: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  createdAt: string
}

type ContractionListResponse = { data: ContractionLog[]; error: null }

export function useContractionLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: contractionKeys.list(babyId),
    queryFn: () =>
      api.get<ContractionListResponse>(`/api/contractions?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: contractionKeys.list(babyId) })
    socket.on('contraction:created', invalidate)
    socket.on('contraction:updated', invalidate)
    socket.on('contraction:deleted', invalidate)
    return () => {
      socket.off('contraction:created', invalidate)
      socket.off('contraction:updated', invalidate)
      socket.off('contraction:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const startMutation = useMutation({
    mutationFn: () =>
      api.post('/api/contractions/start', { babyId }).then((r) => r.data.data as ContractionLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractionKeys.list(babyId) }),
  })

  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/contractions/${id}/end`, {}).then((r) => r.data.data as ContractionLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractionKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/contractions/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractionKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const activeSession = logs.find((l) => !l.endedAt) ?? null
  const completedLogs = logs.filter((l) => l.endedAt)
  const lastCompleted = completedLogs[0] ?? null

  return {
    logs,
    isLoading: query.isLoading,
    activeSession,
    completedLogs,
    lastCompleted,
    startMutation,
    endMutation,
    deleteMutation,
  }
}
