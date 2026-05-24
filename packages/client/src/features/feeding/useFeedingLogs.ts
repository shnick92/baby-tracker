import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { FeedingType, UpdateFeedingInput } from '@tracker/shared'

import { feedingKeys } from './queryKeys'

export type FeedingLog = {
  id: string
  babyId: string
  loggedById: string
  type: FeedingType
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  volumeOz: number | null
  milkType: string | null
  formulaName: string | null
  notes: string | null
  createdAt: string
}

type FeedingListResponse = { data: FeedingLog[]; error: null }

export function useFeedingLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: feedingKeys.list(babyId),
    queryFn: () =>
      api.get<FeedingListResponse>(`/api/feeding?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) })
    socket.on('feeding:created', invalidate)
    socket.on('feeding:updated', invalidate)
    socket.on('feeding:deleted', invalidate)
    return () => {
      socket.off('feeding:created', invalidate)
      socket.off('feeding:updated', invalidate)
      socket.off('feeding:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const startMutation = useMutation({
    mutationFn: (type: 'BREAST_LEFT' | 'BREAST_RIGHT') =>
      api.post('/api/feeding/start', { babyId, type }).then((r) => r.data.data as FeedingLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/feeding/${id}/end`, {}).then((r) => r.data.data as FeedingLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const logBottleMutation = useMutation({
    mutationFn: ({ volumeOz, milkType, formulaName }: { volumeOz: number; milkType?: string; formulaName?: string }) =>
      api.post('/api/feeding/bottle', { babyId, volumeOz, milkType, formulaName }).then((r) => r.data.data as FeedingLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const logPumpMutation = useMutation({
    mutationFn: ({ volumeOz, durationSec }: { volumeOz: number; durationSec?: number }) =>
      api.post('/api/feeding/pump', { babyId, volumeOz, durationSec }).then((r) => r.data.data as FeedingLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateFeedingInput) =>
      api.patch(`/api/feeding/${id}`, data).then((r) => r.data.data as FeedingLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/feeding/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedingKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const activeSession = logs.find(
    (l) => !l.endedAt && (l.type === 'BREAST_LEFT' || l.type === 'BREAST_RIGHT'),
  ) ?? null

  const today = new Date().toDateString()
  const feedCountToday = logs.filter((l) => {
    const ts = l.endedAt ?? l.startedAt
    return new Date(ts).toDateString() === today
  }).length

  const knownFormulaNames = Array.from(
    new Set(
      logs
        .filter((l) => l.type === 'BOTTLE' && l.milkType === 'FORMULA' && l.formulaName)
        .map((l) => l.formulaName!),
    ),
  )

  return {
    logs,
    isLoading: query.isLoading,
    activeSession,
    feedCountToday,
    knownFormulaNames,
    startMutation,
    endMutation,
    logBottleMutation,
    logPumpMutation,
    editMutation,
    deleteMutation,
  }
}
