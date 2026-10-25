import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { enqueueOffline, getQueueCount, isOfflineError } from '@lib/offlineQueue'
import { useSocketStore } from '@stores/socketStore'
import { useActiveEpisode } from '@features/illness'
import type { DiaperType, DiaperColor, DiaperConsistency, UpdateDiaperInput } from '@tracker/shared'

import { diaperKeys } from './queryKeys'
import { countDiapers, startOfLocalDay } from './utils/groupDiapersByDay'

// How many local days of history the diaper list covers (today + 6 prior).
// During an active sick episode the window stretches back to the episode's start.
export const DIAPER_HISTORY_DAYS = 7

export function diaperHistoryStart(episodeStartedAt?: string | null, now = new Date()): Date {
  const windowStart = startOfLocalDay(DIAPER_HISTORY_DAYS - 1, now)
  if (!episodeStartedAt) return windowStart
  const episodeStart = startOfLocalDay(0, new Date(episodeStartedAt))
  return episodeStart < windowStart ? episodeStart : windowStart
}

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
  const setQueueCount = useSocketStore((s) => s.setOfflineQueueCount)

  const { data: activeEpisode } = useActiveEpisode()
  const episodeStartedAt = activeEpisode?.startedAt ?? null

  const query = useQuery({
    // Episode start in the key refetches when an episode begins or ends; the
    // diaperKeys.list prefix keeps socket/mutation invalidation working
    queryKey: [...diaperKeys.list(babyId), episodeStartedAt],
    // `since` is computed per fetch so the window rolls forward past midnight
    queryFn: () =>
      api
        .get<DiaperListResponse>('/api/diaper', {
          params: { babyId, since: diaperHistoryStart(episodeStartedAt).toISOString() },
        })
        .then((r) => r.data.data),
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
    onError: async (error, variables) => {
      if (isOfflineError(error)) {
        // Stamp the tap time so a later replay doesn't record the change as happening on reconnect
        await enqueueOffline('/api/diaper', { babyId, occurredAt: new Date().toISOString(), ...variables })
        setQueueCount(await getQueueCount())
      }
    },
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
  const todayStart = startOfLocalDay().getTime()
  const todayLogs = logs.filter((l) => new Date(l.occurredAt).getTime() >= todayStart)
  const { total: totalCount, wet: wetCount, dirty: dirtyCount } = countDiapers(todayLogs)

  return { logs, isLoading: query.isLoading, todayLogs, totalCount, wetCount, dirtyCount, logMutation, editMutation, deleteMutation }
}
