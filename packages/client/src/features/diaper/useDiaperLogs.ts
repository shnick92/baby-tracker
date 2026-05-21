import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { DiaperType, DiaperColor, DiaperConsistency, UpdateDiaperInput } from '@tracker/shared'

import { diaperKeys } from './queryKeys'

export type DiaperLog = {
  id: string
  babyId: string
  loggedById: string
  type: DiaperType
  color: DiaperColor | null
  consistency: DiaperConsistency | null
  customConsistency: string | null
  occurredAt: string
  notes: string | null
  createdAt: string
}

type DiaperListResponse = { data: DiaperLog[]; error: null }

export type LogDiaperPayload = {
  type: DiaperType
  color?: DiaperColor
  consistency?: DiaperConsistency
  customConsistency?: string
  notes?: string
}

export function useDiaperLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: diaperKeys.list(babyId),
    queryFn: () =>
      api.get<DiaperListResponse>(`/api/diaper?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: diaperKeys.list(babyId) })
    socket.on('diaper:created', invalidate)
    socket.on('diaper:updated', invalidate)
    socket.on('diaper:deleted', invalidate)
    return () => {
      socket.off('diaper:created', invalidate)
      socket.off('diaper:updated', invalidate)
      socket.off('diaper:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (payload: LogDiaperPayload) =>
      api.post('/api/diaper', { babyId, ...payload }).then((r) => r.data.data as DiaperLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diaperKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateDiaperInput) =>
      api.patch(`/api/diaper/${id}`, data).then((r) => r.data.data as DiaperLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diaperKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/diaper/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diaperKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const today = new Date().toDateString()
  const todayLogs = logs.filter((l) => new Date(l.occurredAt).toDateString() === today)
  const wetCount = todayLogs.filter((l) => l.type === 'WET' || l.type === 'BOTH').length
  const dirtyCount = todayLogs.filter((l) => l.type === 'DIRTY' || l.type === 'BOTH').length

  return { logs, isLoading: query.isLoading, todayLogs, wetCount, dirtyCount, logMutation, editMutation, deleteMutation }
}
