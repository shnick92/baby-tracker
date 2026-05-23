import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { formatDuration, formatOz } from '@lib/utils'

import type { MoodLog } from './useMoodLogs'
import { moodKeys } from './queryKeys'
import { MOOD_STATES, BUILT_IN_ACTIVITIES, getBuiltInConfig } from './moodConfig'

type FeedingLog = {
  id: string
  type: 'BREAST_LEFT' | 'BREAST_RIGHT' | 'BOTTLE' | 'PUMP'
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  volumeOz: number | null
}

type DiaperLog = {
  id: string
  type: 'WET' | 'DIRTY' | 'BOTH'
  occurredAt: string
}

type SleepLog = {
  id: string
  type: 'NAP' | 'NIGHT'
  startedAt: string
  endedAt: string | null
}

type TummyTimeLog = {
  id: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
}

export type FeedItem =
  | {
      source: 'mood'
      id: string
      time: string
      emoji: string
      label: string
      detail: string | null
      qualifier: string | null
      moodLog: MoodLog
    }
  | {
      source: 'feeding' | 'diaper' | 'sleep' | 'tummytime'
      id: string
      time: string
      emoji: string
      label: string
      detail: string | null
    }

const FEEDING_CONFIG: Record<FeedingLog['type'], { emoji: string; label: string }> = {
  BOTTLE:       { emoji: '🍼', label: 'Bottle' },
  BREAST_LEFT:  { emoji: '🤱', label: 'Breastfeed · left' },
  BREAST_RIGHT: { emoji: '🤱', label: 'Breastfeed · right' },
  PUMP:         { emoji: '🫙', label: 'Pump' },
}

const DIAPER_CONFIG: Record<DiaperLog['type'], { emoji: string; label: string }> = {
  WET:   { emoji: '💧', label: 'Wet diaper' },
  DIRTY: { emoji: '💩', label: 'Dirty diaper' },
  BOTH:  { emoji: '💩', label: 'Wet + dirty' },
}

function feedingToItem(log: FeedingLog): FeedItem {
  const detail =
    log.volumeOz != null ? formatOz(log.volumeOz) :
    log.durationSec != null ? formatDuration(log.durationSec) : null
  const cfg = FEEDING_CONFIG[log.type]
  return { source: 'feeding', id: log.id, time: log.startedAt, ...cfg, detail }
}

function diaperToItem(log: DiaperLog): FeedItem {
  const cfg = DIAPER_CONFIG[log.type]
  return { source: 'diaper', id: log.id, time: log.occurredAt, ...cfg, detail: null }
}

function tummyTimeToItem(log: TummyTimeLog): FeedItem {
  return {
    source: 'tummytime',
    id: log.id,
    time: log.endedAt ?? log.startedAt,
    emoji: '🐢',
    label: 'Tummy time',
    detail: log.durationSec != null ? formatDuration(log.durationSec) : null,
  }
}

function sleepToItem(log: SleepLog): FeedItem {
  const durationSec = log.endedAt
    ? Math.round((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
    : null
  return {
    source: 'sleep',
    id: log.id,
    time: log.endedAt ?? log.startedAt,
    emoji: log.type === 'NAP' ? '😴' : '🌙',
    label: log.type === 'NAP' ? 'Nap' : 'Night sleep',
    detail: durationSec != null ? formatDuration(durationSec) : null,
  }
}

function moodToItem(log: MoodLog): FeedItem {
  let emoji = '❓'
  let label = log.mood ?? 'Activity'

  if (log.customActivity) {
    emoji = log.customActivity.emoji
    label = log.customActivity.name
  } else if (log.mood) {
    const cfg = getBuiltInConfig(log.mood)
    if (cfg) { emoji = cfg.emoji; label = cfg.label }
  }

  const qualifierLabel = log.qualifier
    ? MOOD_STATES.find((m) => m.mood === log.qualifier)?.label ?? null
    : null

  return { source: 'mood', id: log.id, time: log.occurredAt, emoji, label, detail: null, qualifier: qualifierLabel, moodLog: log }
}

export function useActivityFeed(babyId: string) {
  const queryClient = useQueryClient()

  const moodQuery = useQuery({
    queryKey: moodKeys.list(babyId),
    queryFn: () =>
      api.get<{ data: MoodLog[] }>(`/api/mood?babyId=${babyId}&limit=30`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const feedingQuery = useQuery({
    queryKey: ['feedFeedingLogs', babyId],
    queryFn: () =>
      api.get<{ data: FeedingLog[] }>(`/api/feeding?babyId=${babyId}&limit=30`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const diaperQuery = useQuery({
    queryKey: ['feedDiaperLogs', babyId],
    queryFn: () =>
      api.get<{ data: DiaperLog[] }>(`/api/diaper?babyId=${babyId}&limit=30`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const sleepQuery = useQuery({
    queryKey: ['feedSleepLogs', babyId],
    queryFn: () =>
      api.get<{ data: SleepLog[] }>(`/api/sleep?babyId=${babyId}&limit=20`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const tummyTimeQuery = useQuery({
    queryKey: ['feedTummyTimeLogs', babyId],
    queryFn: () =>
      api.get<{ data: TummyTimeLog[] }>(`/api/tummy-time?babyId=${babyId}&limit=20`).then((r) => r.data.data),
    staleTime: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const inv = (key: string[]) => () => queryClient.invalidateQueries({ queryKey: key })
    const handlers: [string, () => void][] = [
      ['feeding:created', inv(['feedFeedingLogs', babyId])],
      ['feeding:updated', inv(['feedFeedingLogs', babyId])],
      ['feeding:deleted', inv(['feedFeedingLogs', babyId])],
      ['diaper:created',  inv(['feedDiaperLogs', babyId])],
      ['diaper:updated',  inv(['feedDiaperLogs', babyId])],
      ['diaper:deleted',  inv(['feedDiaperLogs', babyId])],
      ['sleep:created',      inv(['feedSleepLogs', babyId])],
      ['sleep:updated',      inv(['feedSleepLogs', babyId])],
      ['sleep:deleted',      inv(['feedSleepLogs', babyId])],
      ['tummytime:created',  inv(['feedTummyTimeLogs', babyId])],
      ['tummytime:updated',  inv(['feedTummyTimeLogs', babyId])],
      ['tummytime:deleted',  inv(['feedTummyTimeLogs', babyId])],
    ]
    handlers.forEach(([ev, fn]) => socket.on(ev, fn))
    return () => handlers.forEach(([ev, fn]) => socket.off(ev, fn))
  }, [babyId, queryClient])

  const moodLogs = moodQuery.data ?? []

  const feedItems: FeedItem[] = [
    ...moodLogs.map(moodToItem),
    ...(feedingQuery.data ?? []).filter((l) => l.endedAt != null || l.volumeOz != null).map(feedingToItem),
    ...(diaperQuery.data ?? []).map(diaperToItem),
    ...(sleepQuery.data ?? []).filter((l) => l.endedAt != null).map(sleepToItem),
    ...(tummyTimeQuery.data ?? []).filter((l) => l.endedAt != null).map(tummyTimeToItem),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return {
    feedItems,
    moodLogs,
    isLoading: moodQuery.isLoading || feedingQuery.isLoading || diaperQuery.isLoading || sleepQuery.isLoading || tummyTimeQuery.isLoading,
  }
}

export { BUILT_IN_ACTIVITIES, MOOD_STATES }
