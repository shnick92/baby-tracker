import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'
import { illnessKeys } from './queryKeys'

export type SicknessSymptom = {
  id: string
  episodeId: string
  label: string
  onsetAt: string | null
  resolvedAt: string | null
  createdAt: string
}

export type TemperatureLog = {
  id: string
  babyId: string
  episodeId: string | null
  loggedById: string
  tempF: number
  method: 'FOREHEAD' | 'EAR' | 'RECTAL' | 'AXILLARY' | 'ORAL'
  recordedAt: string
  notes: string | null
  createdAt: string
}

export type EpisodeTimelineLog = {
  id: string
  type: string
  time: string
  label: string
  sub?: string
  category: 'feeding' | 'sleep' | 'diaper' | 'medication' | 'mood'
}

export type SicknessEpisode = {
  id: string
  babyId: string
  startedById: string
  startedAt: string
  endedAt: string | null
  notes: string | null
  symptoms: SicknessSymptom[]
  temperatureLogs: TemperatureLog[]
  createdAt: string
}

export type EpisodeDetail = SicknessEpisode & {
  feedingLogs: Array<{ id: string; type: string; startedAt: string; endedAt: string | null; volumeOz: number | null; durationSec: number | null; notes: string | null }>
  sleepLogs: Array<{ id: string; type: string; startedAt: string; endedAt: string | null; notes: string | null }>
  diaperLogs: Array<{ id: string; type: string; occurredAt: string; notes: string | null }>
  medicationLogs: Array<{ id: string; name: string; dosageNote: string | null; givenAt: string; notes: string | null }>
  moodLogs: Array<{ id: string; mood: string | null; occurredAt: string; notes: string | null }>
}

export function useActiveEpisode() {
  const babyId = useAuthStore((s) => s.babyId)

  return useQuery({
    queryKey: illnessKeys.active(babyId ?? ''),
    queryFn: () =>
      api
        .get<{ data: SicknessEpisode | null; error: null }>(`/api/illness?babyId=${babyId}&active=true`)
        .then((r) => r.data.data),
    enabled: !!babyId,
    staleTime: 30_000,
  })
}

export function useEpisodes() {
  const babyId = useAuthStore((s) => s.babyId)

  return useQuery({
    queryKey: illnessKeys.all(babyId ?? ''),
    queryFn: () =>
      api
        .get<{ data: SicknessEpisode[]; error: null }>(`/api/illness?babyId=${babyId}`)
        .then((r) => r.data.data),
    enabled: !!babyId,
    staleTime: 60_000,
  })
}

export function useEpisodeDetail(episodeId: string | undefined) {
  return useQuery({
    queryKey: illnessKeys.detail(episodeId ?? ''),
    queryFn: () =>
      api
        .get<{ data: EpisodeDetail; error: null }>(`/api/illness/${episodeId}`)
        .then((r) => r.data.data),
    enabled: !!episodeId,
    staleTime: 30_000,
  })
}

export function useIllnessMutations() {
  const queryClient = useQueryClient()
  const babyId = useAuthStore((s) => s.babyId)

  function invalidate(episodeId?: string) {
    queryClient.invalidateQueries({ queryKey: illnessKeys.active(babyId ?? '') })
    queryClient.invalidateQueries({ queryKey: illnessKeys.all(babyId ?? '') })
    if (episodeId) {
      queryClient.invalidateQueries({ queryKey: illnessKeys.detail(episodeId) })
    }
  }

  const startEpisode = useMutation({
    mutationFn: (data: { symptoms: string[]; startedAt?: string; notes?: string }) =>
      api.post<{ data: SicknessEpisode; error: null }>('/api/illness', { babyId, ...data }).then((r) => r.data.data),
    onSuccess: () => invalidate(),
  })

  const endEpisode = useMutation({
    mutationFn: (episodeId: string) =>
      api.patch<{ data: SicknessEpisode; error: null }>(`/api/illness/${episodeId}/end`).then((r) => r.data.data),
    onSuccess: (_, episodeId) => invalidate(episodeId),
  })

  const reopenEpisode = useMutation({
    mutationFn: (episodeId: string) =>
      api.patch<{ data: SicknessEpisode; error: null }>(`/api/illness/${episodeId}/reopen`).then((r) => r.data.data),
    onSuccess: (_, episodeId) => invalidate(episodeId),
  })

  const addSymptom = useMutation({
    mutationFn: ({ episodeId, label }: { episodeId: string; label: string }) =>
      api.post(`/api/illness/${episodeId}/symptoms`, { label }).then((r) => r.data),
    onSuccess: (_, { episodeId }) => invalidate(episodeId),
  })

  const removeSymptom = useMutation({
    mutationFn: ({ episodeId, symptomId }: { episodeId: string; symptomId: string }) =>
      api.delete(`/api/illness/${episodeId}/symptoms/${symptomId}`).then((r) => r.data),
    onSuccess: (_, { episodeId }) => invalidate(episodeId),
  })

  const logTemperature = useMutation({
    mutationFn: ({
      episodeId,
      tempF,
      method,
      recordedAt,
      notes,
    }: {
      episodeId: string
      tempF: number
      method: string
      recordedAt?: string
      notes?: string
    }) =>
      api.post(`/api/illness/${episodeId}/temperature`, { tempF, method, recordedAt, notes }).then((r) => r.data),
    onSuccess: (_, { episodeId }) => invalidate(episodeId),
  })

  const deleteTemperature = useMutation({
    mutationFn: ({ episodeId, tempId }: { episodeId: string; tempId: string }) =>
      api.delete(`/api/illness/${episodeId}/temperature/${tempId}`).then((r) => r.data),
    onSuccess: (_, { episodeId }) => invalidate(episodeId),
  })

  const updateEpisode = useMutation({
    mutationFn: ({ episodeId, ...data }: { episodeId: string; startedAt?: string; endedAt?: string; notes?: string }) =>
      api.patch(`/api/illness/${episodeId}`, data).then((r) => r.data),
    onSuccess: (_, { episodeId }) => invalidate(episodeId),
  })

  return { startEpisode, endEpisode, reopenEpisode, addSymptom, removeSymptom, logTemperature, deleteTemperature, updateEpisode }
}

export type ReportFormat = 'pdf' | 'text'

export function useIllnessReport() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadReport(episodeId: string, format: ReportFormat = 'pdf') {
    setIsPending(true)
    setError(null)
    try {
      const response = await api.get(`/api/illness/${episodeId}/report?format=${format}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data as BlobPart], {
        type: format === 'pdf' ? 'application/pdf' : 'text/plain',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const disposition = response.headers['content-disposition'] as string | undefined
      const match = disposition?.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? `illness-report.${format}`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // iOS share sheet: Web Share API if available and file is supported
      if (navigator.share && format === 'pdf') {
        const file = new File([blob], a.download, { type: 'application/pdf' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Doctor Handoff Report' })
          return
        }
      }
    } catch {
      setError('Failed to generate report')
    } finally {
      setIsPending(false)
    }
  }

  return { downloadReport, isPending, error }
}
