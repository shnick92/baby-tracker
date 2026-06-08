import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'

export type Milestone = {
  id: string
  babyId: string
  category: string
  label: string
  achievedAt: string | null
  notes: string | null
  createdAt: string
}

type MilestoneListResponse = { data: Milestone[]; error: null }

export const milestoneKeys = {
  all: ['milestones'] as const,
  list: (babyId: string) => ['milestones', babyId] as const,
}

export function useMilestones(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: milestoneKeys.list(babyId),
    queryFn: () =>
      api
        .get<MilestoneListResponse>(`/api/milestones?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: milestoneKeys.list(babyId) })
    socket.on('milestone:created', invalidate)
    socket.on('milestone:updated', invalidate)
    socket.on('milestone:deleted', invalidate)
    return () => {
      socket.off('milestone:created', invalidate)
      socket.off('milestone:updated', invalidate)
      socket.off('milestone:deleted', invalidate)
    }
  }, [babyId, queryClient])

  const achieveMutation = useMutation({
    mutationFn: ({ id, achievedAt, notes }: { id: string; achievedAt: string | null; notes?: string | null }) =>
      api.patch(`/api/milestones/${id}`, { achievedAt, notes }).then((r) => r.data.data as Milestone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: milestoneKeys.list(babyId) }),
  })

  const addCustomMutation = useMutation({
    mutationFn: (label: string) =>
      api.post('/api/milestones', { babyId, label }).then((r) => r.data.data as Milestone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: milestoneKeys.list(babyId) }),
  })

  const deleteCustomMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/milestones/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: milestoneKeys.list(babyId) }),
  })

  return {
    milestones: query.data ?? [],
    isLoading: query.isLoading,
    achieveMutation,
    addCustomMutation,
    deleteCustomMutation,
  }
}
