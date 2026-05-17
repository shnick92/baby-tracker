import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { useAuthStore } from '@stores/authStore'
import type { ChecklistTypeInput } from '@tracker/shared'

import { checklistKeys } from './queryKeys'

type ChecklistItem = {
  id: string
  label: string
  category: string
  notes: string | null
  isChecked: boolean
  checkedAt: string | null
  sortOrder: number
}

type Checklist = {
  id: string
  type: string
  items: ChecklistItem[]
} | null

export function useChecklist(activeType: ChecklistTypeInput) {
  const babyId = useAuthStore((s) => s.babyId) ?? ''
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: checklistKeys.detail(activeType, babyId),
    queryFn: () =>
      api
        .get<{ data: Checklist }>(`/api/checklist/${activeType.toLowerCase()}`, {
          params: { babyId },
        })
        .then((r) => r.data.data),
    enabled: !!babyId,
  })

  useEffect(() => {
    const socket = getSocket()
    const handler = ({ type, babyId: bid }: { type: string; babyId: string }) => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.detail(type as ChecklistTypeInput, bid),
      })
    }
    socket.on('checklist:updated', handler)
    return () => { socket.off('checklist:updated', handler) }
  }, [queryClient])

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) =>
      api.patch(`/api/checklist/items/${itemId}/toggle`, { isChecked }),
    onMutate: async ({ itemId, isChecked }) => {
      const key = checklistKeys.detail(activeType, babyId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Checklist>(key)
      queryClient.setQueryData<Checklist>(key, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) =>
                i.id === itemId ? { ...i, isChecked, checkedAt: isChecked ? new Date().toISOString() : null } : i,
              ),
            }
          : old,
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined)
        queryClient.setQueryData(checklistKeys.detail(activeType, babyId), ctx.prev)
    },
  })

  const addMutation = useMutation({
    mutationFn: ({ label, category }: { label: string; category: string }) =>
      api.post(
        `/api/checklist/${activeType.toLowerCase()}/items`,
        { label, category: category || 'Custom' },
        { params: { babyId } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.detail(activeType, babyId) })
    },
  })

  return { data, isLoading, babyId, toggleMutation, addMutation }
}
