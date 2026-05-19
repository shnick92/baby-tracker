import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { useAuthStore } from '@stores/authStore'

import { visitorKeys } from './queryKeys'

export type VisitorSlot = {
  id: string
  name: string
  date: string
  startTime: string | null
  endTime: string | null
  notes: string | null
}

export function useVisitors() {
  const babyId = useAuthStore((s) => s.babyId) ?? ''
  const queryClient = useQueryClient()

  const { data: slots = [], isLoading } = useQuery({
    queryKey: visitorKeys.list(babyId),
    queryFn: () =>
      api
        .get<{ data: VisitorSlot[] }>('/api/visitors', { params: { babyId } })
        .then((r) => r.data.data),
    enabled: !!babyId,
  })

  useEffect(() => {
    const socket = getSocket()
    const handler = ({ babyId: bid }: { babyId: string }) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.list(bid) })
    }
    socket.on('visitors:updated', handler)
    return () => { socket.off('visitors:updated', handler) }
  }, [queryClient])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/visitors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitorKeys.list(babyId) }),
  })

  const addMutation = useMutation({
    mutationFn: (input: {
      name: string
      date: string
      startTime?: string
      endTime?: string
      notes?: string
    }) => api.post('/api/visitors', input, { params: { babyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.list(babyId) })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name: string
      date: string
      startTime?: string
      endTime?: string
      notes?: string
    }) => api.patch(`/api/visitors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.list(babyId) })
    },
  })

  return { slots, isLoading, deleteMutation, addMutation, editMutation }
}
