import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { LogVaccinationInput, UpdateVaccinationInput } from '@tracker/shared'

export type VaccinationRecord = {
  id: string
  babyId: string
  vaccineKey: string
  administeredAt: string
  lotNumber: string | null
  provider: string | null
  notes: string | null
  createdAt: string
}

type VaccinationListResponse = { data: VaccinationRecord[]; error: null }

export const vaccinationKeys = {
  all: ['vaccinations'] as const,
  list: (babyId: string) => ['vaccinations', babyId] as const,
}

export function useVaccinations(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: vaccinationKeys.list(babyId),
    queryFn: () =>
      api
        .get<VaccinationListResponse>(`/api/vaccinations?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: vaccinationKeys.list(babyId) })
    socket.on('vaccination:created', invalidate)
    socket.on('vaccination:updated', invalidate)
    socket.on('vaccination:deleted', invalidate)
    return () => {
      socket.off('vaccination:created', invalidate)
      socket.off('vaccination:updated', invalidate)
      socket.off('vaccination:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (data: Omit<LogVaccinationInput, 'babyId'>) =>
      api.post('/api/vaccinations', { babyId, ...data }).then((r) => r.data.data as VaccinationRecord),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vaccinationKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateVaccinationInput) =>
      api.patch(`/api/vaccinations/${id}`, data).then((r) => r.data.data as VaccinationRecord),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vaccinationKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/vaccinations/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vaccinationKeys.list(babyId) }),
  })

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    logMutation,
    editMutation,
    deleteMutation,
  }
}
