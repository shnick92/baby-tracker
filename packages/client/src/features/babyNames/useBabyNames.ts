import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'

export type BabyNameReaction = {
  id: string
  nameId: string
  userId: string
  emoji: string
  createdAt: string
  updatedAt: string
}

export type BabyName = {
  id: string
  babyId: string
  firstName: string
  middleName: string | null
  addedById: string
  reactions: BabyNameReaction[]
  createdAt: string
  updatedAt: string
}

type BabyNamesListResponse = { data: BabyName[]; error: null }

export const babyNameKeys = {
  all: ['babyNames'] as const,
  list: (babyId: string) => ['babyNames', babyId] as const,
}

export function useBabyNames(babyId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: babyNameKeys.list(babyId),
    queryFn: () =>
      api
        .get<BabyNamesListResponse>(`/api/baby-names?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) })
    socket.on('babyName:created', invalidate)
    socket.on('babyName:updated', invalidate)
    socket.on('babyName:deleted', invalidate)
    socket.on('babyName:reacted', invalidate)
    return () => {
      socket.off('babyName:created', invalidate)
      socket.off('babyName:updated', invalidate)
      socket.off('babyName:deleted', invalidate)
      socket.off('babyName:reacted', invalidate)
    }
  }, [babyId, queryClient])

  const addMutation = useMutation({
    mutationFn: ({ firstName, middleName }: { firstName: string; middleName?: string }) =>
      api.post('/api/baby-names', { babyId, firstName, middleName }).then((r) => r.data.data as BabyName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, firstName, middleName }: { id: string; firstName?: string; middleName?: string | null }) =>
      api.patch(`/api/baby-names/${id}`, { firstName, middleName }).then((r) => r.data.data as BabyName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/baby-names/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) }),
  })

  const reactMutation = useMutation({
    mutationFn: ({ nameId, emoji }: { nameId: string; emoji: string }) =>
      api.put(`/api/baby-names/${nameId}/reaction`, { emoji }).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) }),
  })

  const removeReactionMutation = useMutation({
    mutationFn: (nameId: string) => api.delete(`/api/baby-names/${nameId}/reaction`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: babyNameKeys.list(babyId) }),
  })

  return {
    names: query.data ?? [],
    isLoading: query.isLoading,
    addMutation,
    editMutation,
    deleteMutation,
    reactMutation,
    removeReactionMutation,
  }
}
