import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { UpdateWeightInput } from '@tracker/shared'

import { weightKeys } from './queryKeys'

export type WeightLog = {
  id: string
  babyId: string
  loggedById: string
  lbs: number
  oz: number
  recordedAt: string
  notes: string | null
  createdAt: string
}

type WeightListResponse = { data: WeightLog[]; error: null }

export type LogWeightPayload = {
  lbs: number
  oz: number
  recordedAt?: string
  notes?: string
}

export function totalLbs(log: WeightLog): number {
  return log.lbs + log.oz / 16
}

export function formatWeight(log: WeightLog): string {
  if (log.oz === 0) return `${log.lbs} lb`
  const ozDisplay = Number.isInteger(log.oz) ? log.oz : log.oz.toFixed(1)
  return `${log.lbs} lb ${ozDisplay} oz`
}

export function useWeightLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: weightKeys.list(babyId),
    queryFn: () =>
      api
        .get<WeightListResponse>(`/api/weight?babyId=${babyId}&limit=100`)
        .then((r) => r.data.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: weightKeys.list(babyId) })
    socket.on('weight:created', invalidate)
    socket.on('weight:updated', invalidate)
    socket.on('weight:deleted', invalidate)
    return () => {
      socket.off('weight:created', invalidate)
      socket.off('weight:updated', invalidate)
      socket.off('weight:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (payload: LogWeightPayload) =>
      api
        .post('/api/weight', { babyId, ...payload })
        .then((r) => r.data.data as WeightLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: weightKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateWeightInput) =>
      api
        .patch(`/api/weight/${id}`, data)
        .then((r) => r.data.data as WeightLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: weightKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/weight/${id}`).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: weightKeys.list(babyId) }),
  })

  const logs = query.data ?? []

  return { logs, isLoading: query.isLoading, logMutation, editMutation, deleteMutation }
}
