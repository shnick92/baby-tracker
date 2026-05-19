import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { useAuthStore } from '@stores/authStore'
import type { PurchaseStatus } from '@tracker/shared'

import { purchaseKeys } from './queryKeys'

type Purchase = {
  id: string
  name: string
  category: string
  status: PurchaseStatus
  price: number | null
  notes: string | null
  url: string | null
  shortCode: string | null
}

type PurchasesResponse = { data: Purchase[]; meta: { total: number; bought: number } }

export function usePurchases() {
  const babyId = useAuthStore((s) => s.babyId) ?? ''
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: purchaseKeys.list(babyId),
    queryFn: () =>
      api
        .get<PurchasesResponse>('/api/purchases', { params: { babyId } })
        .then((r) => r.data),
    enabled: !!babyId,
  })

  useEffect(() => {
    const socket = getSocket()
    const handler = ({ babyId: bid }: { babyId: string }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(bid) })
    }
    socket.on('purchase:updated', handler)
    return () => { socket.off('purchase:updated', handler) }
  }, [queryClient])

  const cycleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseStatus }) =>
      api.patch(`/api/purchases/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      const key = purchaseKeys.list(babyId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key)
      queryClient.setQueryData<PurchasesResponse>(key, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((p) => (p.id === id ? { ...p, status } : p)),
            }
          : old,
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(purchaseKeys.list(babyId), ctx.prev)
    },
  })

  const addMutation = useMutation({
    mutationFn: (input: { name: string; category: string; price?: number; url?: string }) =>
      api.post('/api/purchases', input, { params: { babyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(babyId) })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/purchases/${id}`),
    onMutate: async (id) => {
      const key = purchaseKeys.list(babyId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key)
      queryClient.setQueryData<PurchasesResponse>(key, (old) => {
        if (!old) return old
        const filtered = old.data.filter((p) => p.id !== id)
        const bought = filtered.filter((p) => p.status === 'BOUGHT' || p.status === 'GIFTED').length
        return { data: filtered, meta: { total: filtered.length, bought } }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(purchaseKeys.list(babyId), ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(babyId) })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name: string
      category?: string
      price?: number
      url?: string
      notes?: string
    }) => api.patch(`/api/purchases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(babyId) })
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.delete(`/api/purchases/${id}`))),
    onMutate: async (ids) => {
      const key = purchaseKeys.list(babyId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key)
      const idSet = new Set(ids)
      queryClient.setQueryData<PurchasesResponse>(key, (old) => {
        if (!old) return old
        const filtered = old.data.filter((p) => !idSet.has(p.id))
        const bought = filtered.filter((p) => p.status === 'BOUGHT' || p.status === 'GIFTED').length
        return { data: filtered, meta: { total: filtered.length, bought } }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(purchaseKeys.list(babyId), ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(babyId) })
    },
  })

  return { data, isLoading, cycleMutation, addMutation, editMutation, deleteItemMutation, deleteGroupMutation }
}
