import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import type { LogMoodInput, UpdateMoodInput, CreateCustomActivityInput } from '@tracker/shared'

import { moodKeys } from './queryKeys'

export type CustomActivity = {
  id: string
  babyId: string
  name: string
  emoji: string
  sortOrder: number
  createdAt: string
}

export type MoodLog = {
  id: string
  babyId: string
  loggedById: string
  mood: 'HAPPY' | 'FUSSY' | 'CRYING' | 'SLEEPING' | 'ALERT' | 'BATH' | 'WALK' | null
  qualifier: 'HAPPY' | 'FUSSY' | 'CRYING' | 'ALERT' | null
  customActivityId: string | null
  customActivity: CustomActivity | null
  occurredAt: string
  notes: string | null
  createdAt: string
}

type MoodListResponse = { data: MoodLog[]; error: null }
type CustomActivityListResponse = { data: CustomActivity[]; error: null }

export function useMoodLogs(babyId: string) {
  const queryClient = useQueryClient()

  const logsQuery = useQuery({
    queryKey: moodKeys.list(babyId),
    queryFn: () =>
      api.get<MoodListResponse>(`/api/mood?babyId=${babyId}`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const activitiesQuery = useQuery({
    queryKey: moodKeys.activities(babyId),
    queryFn: () =>
      api
        .get<CustomActivityListResponse>(`/api/mood/activities?babyId=${babyId}`)
        .then((r) => r.data.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: moodKeys.list(babyId) })
    const invalidateActivities = () =>
      queryClient.invalidateQueries({ queryKey: moodKeys.activities(babyId) })
    socket.on('mood:created', invalidateLogs)
    socket.on('mood:updated', invalidateLogs)
    socket.on('mood:deleted', invalidateLogs)
    socket.on('mood:activities:updated', invalidateActivities)
    return () => {
      socket.off('mood:created', invalidateLogs)
      socket.off('mood:updated', invalidateLogs)
      socket.off('mood:deleted', invalidateLogs)
      socket.off('mood:activities:updated', invalidateActivities)
    }
  }, [babyId, queryClient])

  const logMutation = useMutation({
    mutationFn: (data: Omit<LogMoodInput, 'babyId'>) =>
      api.post('/api/mood', { babyId, ...data }).then((r) => r.data.data as MoodLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moodKeys.list(babyId) }),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateMoodInput) =>
      api.patch(`/api/mood/${id}`, data).then((r) => r.data.data as MoodLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moodKeys.list(babyId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/mood/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moodKeys.list(babyId) }),
  })

  const createActivityMutation = useMutation({
    mutationFn: (data: Omit<CreateCustomActivityInput, 'babyId'>) =>
      api
        .post('/api/mood/activities', { babyId, ...data })
        .then((r) => r.data.data as CustomActivity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moodKeys.activities(babyId) }),
  })

  const deleteActivityMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/mood/activities/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moodKeys.activities(babyId) }),
  })

  const logs = logsQuery.data ?? []
  const customActivities = activitiesQuery.data ?? []
  const today = new Date().toDateString()
  const todayLogs = logs.filter((l) => new Date(l.occurredAt).toDateString() === today)

  return {
    logs,
    todayLogs,
    customActivities,
    isLoading: logsQuery.isLoading,
    logMutation,
    editMutation,
    deleteMutation,
    createActivityMutation,
    deleteActivityMutation,
  }
}
