import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { UpdateMedicationInput } from '@tracker/shared'

import { medicationKeys } from './queryKeys'

export type MedicationLog = {
  id: string
  babyId: string
  loggedById: string
  name: string
  dosageMg: number | null
  dosageNote: string | null
  givenAt: string
  notes: string | null
  createdAt: string
}

type MedicationListResponse = { data: MedicationLog[]; error: null }

export type LogMedicationPayload = {
  name: string
  dosageNote?: string
  givenAt?: string
  notes?: string
}

export function useMedicationLogs(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: medicationKeys.list(babyId),
    queryFn: () =>
      api
        .get<MedicationListResponse>(`/api/medication?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(babyId) })
    socket.on('medication:created', invalidate)
    socket.on('medication:updated', invalidate)
    socket.on('medication:deleted', invalidate)
    return () => {
      socket.off('medication:created', invalidate)
      socket.off('medication:updated', invalidate)
      socket.off('medication:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (payload: LogMedicationPayload) =>
      api
        .post('/api/medication', { babyId, ...payload })
        .then((r) => r.data.data as MedicationLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateMedicationInput) =>
      api
        .patch(`/api/medication/${id}`, data)
        .then((r) => r.data.data as MedicationLog),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/medication/${id}`).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(babyId) }),
  })

  const logs = query.data ?? []
  const today = new Date().toDateString()
  const todayLogs = logs.filter((l) => new Date(l.givenAt).toDateString() === today)

  // Distinct names from all logs — most recent first for autocomplete
  const knownNames = Array.from(new Set(logs.map((l) => l.name)))

  return {
    logs,
    isLoading: query.isLoading,
    todayLogs,
    knownNames,
    logMutation,
    editMutation,
    deleteMutation,
  }
}
