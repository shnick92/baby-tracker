import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { UpdateTummyTimeInput } from '@tracker/shared'

import { tummyTimeKeys } from './queryKeys'

export type TummyTimeLog = {
  id: string
  babyId: string
  loggedById: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  notes: string | null
  createdAt: string
}

type TummyTimeListResponse = { data: TummyTimeLog[]; error: null }

export function useTummyTimeLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: tummyTimeKeys.list(babyId),
    queryFn: () =>
      api.get<TummyTimeListResponse>(`/api/tummy-time?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: tummyTimeKeys.list(babyId) })
    socket.on('tummytime:created', invalidate)
    socket.on('tummytime:updated', invalidate)
    socket.on('tummytime:deleted', invalidate)
    return () => {
      socket.off('tummytime:created', invalidate)
      socket.off('tummytime:updated', invalidate)
      socket.off('tummytime:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const startMutation = useMutation({
    mutationFn: () =>
      api.post('/api/tummy-time/start', { babyId }).then((r) => r.data.data as TummyTimeLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tummyTimeKeys.list(babyId) }),
  })

  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/tummy-time/${id}/end`, {}).then((r) => r.data.data as TummyTimeLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tummyTimeKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateTummyTimeInput) =>
      api.patch(`/api/tummy-time/${id}`, data).then((r) => r.data.data as TummyTimeLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tummyTimeKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tummy-time/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tummyTimeKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const activeSession = logs.find((l) => !l.endedAt) ?? null

  const today = new Date().toDateString()
  const completedToday = logs.filter(
    (l) => l.endedAt && new Date(l.startedAt).toDateString() === today,
  )
  const totalTodaySec = completedToday.reduce((acc, l) => acc + (l.durationSec ?? 0), 0)

  return {
    logs,
    isLoading: query.isLoading,
    activeSession,
    totalTodaySec,
    completedToday,
    startMutation,
    endMutation,
    editMutation,
    deleteMutation,
  }
}
