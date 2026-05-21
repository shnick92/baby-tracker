import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { SleepType, UpdateSleepInput } from '@tracker/shared'

import { sleepKeys } from './queryKeys'

export type SleepLog = {
  id: string
  babyId: string
  loggedById: string
  type: SleepType
  startedAt: string
  endedAt: string | null
  notes: string | null
  createdAt: string
}

type SleepListResponse = { data: SleepLog[]; error: null }

export function useSleepLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: sleepKeys.list(babyId),
    queryFn: () =>
      api.get<SleepListResponse>(`/api/sleep?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: sleepKeys.list(babyId) })
    socket.on('sleep:created', invalidate)
    socket.on('sleep:updated', invalidate)
    socket.on('sleep:deleted', invalidate)
    return () => {
      socket.off('sleep:created', invalidate)
      socket.off('sleep:updated', invalidate)
      socket.off('sleep:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const startMutation = useMutation({
    mutationFn: (type: SleepType) =>
      api.post('/api/sleep/start', { babyId, type }).then((r) => r.data.data as SleepLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sleepKeys.list(babyId) }),
  })

  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/sleep/${id}/end`, {}).then((r) => r.data.data as SleepLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sleepKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSleepInput) =>
      api.patch(`/api/sleep/${id}`, data).then((r) => r.data.data as SleepLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sleepKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/sleep/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sleepKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const activeSession = logs.find((l) => !l.endedAt) ?? null
  const lastEnded = logs.find((l) => l.endedAt) ?? null

  const today = new Date().toDateString()
  const completedToday = logs.filter(
    (l) => l.endedAt && new Date(l.startedAt).toDateString() === today,
  )
  const totalSleepTodaySec = completedToday.reduce((acc, l) => {
    return acc + Math.round((new Date(l.endedAt!).getTime() - new Date(l.startedAt).getTime()) / 1000)
  }, 0)
  const longestStretchSec = completedToday.reduce((max, l) => {
    const dur = Math.round((new Date(l.endedAt!).getTime() - new Date(l.startedAt).getTime()) / 1000)
    return dur > max ? dur : max
  }, 0)

  return { logs, isLoading: query.isLoading, activeSession, lastEnded, totalSleepTodaySec, longestStretchSec, startMutation, endMutation, editMutation, deleteMutation }
}
