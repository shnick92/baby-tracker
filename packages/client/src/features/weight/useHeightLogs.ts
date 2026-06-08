import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { UpdateHeightInput } from '@tracker/shared'

export type HeightLog = {
  id: string
  babyId: string
  loggedById: string
  inches: number
  recordedAt: string
  notes: string | null
  createdAt: string
}

type HeightListResponse = { data: HeightLog[]; error: null }

export type LogHeightPayload = {
  inches: number
  recordedAt?: string
  notes?: string
}

export function formatHeight(inches: number, showCm = false): string {
  if (showCm) {
    return `${(inches * 2.54).toFixed(1)} cm`
  }
  const ft = Math.floor(inches / 12)
  const remIn = inches % 12
  if (ft === 0) return `${remIn.toFixed(1)} in`
  return `${ft} ft ${remIn.toFixed(1)} in`
}

export const heightKeys = {
  all: ['heightLogs'] as const,
  list: (babyId: string) => ['heightLogs', babyId] as const,
}

export function useHeightLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: heightKeys.list(babyId),
    queryFn: () =>
      api
        .get<HeightListResponse>(`/api/height?babyId=${babyId}&limit=100`)
        .then((r) => r.data.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: heightKeys.list(babyId) })
    socket.on('height:created', invalidate)
    socket.on('height:updated', invalidate)
    socket.on('height:deleted', invalidate)
    return () => {
      socket.off('height:created', invalidate)
      socket.off('height:updated', invalidate)
      socket.off('height:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (payload: LogHeightPayload) =>
      api
        .post('/api/height', { babyId, ...payload })
        .then((r) => r.data.data as HeightLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: heightKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateHeightInput) =>
      api
        .patch(`/api/height/${id}`, data)
        .then((r) => r.data.data as HeightLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: heightKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/height/${id}`).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: heightKeys.list(babyId) }),
  })

  const logs = query.data ?? []

  return { logs, isLoading: query.isLoading, logMutation, editMutation, deleteMutation }
}
