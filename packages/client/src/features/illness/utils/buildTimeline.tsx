import { Pill } from 'lucide-react'

import type { EpisodeDetail, SicknessEpisode } from '../useIllness'
import { toTitleCase } from './formatters'

export type TimelineItem = {
  id: string
  time: string
  label: string
  sub: string
  category: 'feeding' | 'sleep' | 'diaper' | 'medication' | 'mood' | 'episode'
  editPath?: string
}

export const CATEGORY_STYLES: Record<string, { dot: string; icon: React.ReactNode }> = {
  feeding: { dot: 'rgba(126,184,232,0.15)', icon: '🍼' },
  sleep: { dot: 'rgba(126,200,160,0.15)', icon: '😴' },
  diaper: { dot: 'rgba(232,196,126,0.15)', icon: '🧷' },
  medication: { dot: 'rgba(180,160,232,0.15)', icon: <Pill size={13} className="text-purple-400" /> },
  mood: { dot: 'rgba(126,216,208,0.15)', icon: '😊' },
  episode: { dot: 'rgba(232,196,126,0.15)', icon: '🤒' },
}

export function buildTimeline(episode: EpisodeDetail | SicknessEpisode): TimelineItem[] {
  const items: TimelineItem[] = []

  items.push({
    id: 'start',
    time: episode.startedAt,
    label: 'Episode started',
    sub: episode.symptoms.map((s) => toTitleCase(s.label)).join(' · ') || '',
    category: 'episode',
  })

  const detail = episode as EpisodeDetail

  if (detail.feedingLogs) {
    for (const f of detail.feedingLogs) {
      const t = f.type === 'BOTTLE' ? 'Bottle' : f.type === 'PUMP' ? 'Pump' : f.type === 'BREAST_LEFT' ? 'Breast · Left' : 'Breast · Right'
      const vol = f.volumeOz ? ` — ${f.volumeOz} oz` : ''
      const dur = f.durationSec ? ` — ${Math.round(f.durationSec / 60)}m` : ''
      items.push({ id: f.id, time: f.startedAt, label: `${t}${vol || dur}`, sub: f.notes ?? '', category: 'feeding', editPath: '/feeding' })
    }
  }

  if (detail.sleepLogs) {
    for (const s of detail.sleepLogs) {
      const type = s.type === 'NAP' ? 'Nap' : 'Night sleep'
      const dur = s.endedAt ? ` — ${Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000)}m` : ' (active)'
      items.push({ id: s.id, time: s.startedAt, label: `${type}${dur}`, sub: s.notes ?? '', category: 'sleep', editPath: '/sleep' })
    }
  }

  if (detail.diaperLogs) {
    for (const d of detail.diaperLogs) {
      const t = d.type === 'WET' ? 'Wet diaper' : d.type === 'DIRTY' ? 'Dirty diaper' : 'Wet + dirty'
      items.push({ id: d.id, time: d.occurredAt, label: t, sub: d.notes ?? '', category: 'diaper', editPath: '/diaper' })
    }
  }

  if (detail.medicationLogs) {
    for (const m of detail.medicationLogs) {
      const dose = m.dosageNote ? ` — ${m.dosageNote}` : ''
      items.push({ id: m.id, time: m.givenAt, label: `${m.name}${dose}`, sub: m.notes ?? '', category: 'medication', editPath: '/medication' })
    }
  }

  if (detail.moodLogs) {
    for (const mo of detail.moodLogs) {
      const label = mo.mood ? mo.mood.charAt(0) + mo.mood.slice(1).toLowerCase() : 'Activity'
      items.push({ id: mo.id, time: mo.occurredAt, label, sub: mo.notes ?? '', category: 'mood', editPath: '/mood' })
    }
  }

  if (episode.endedAt) {
    items.push({
      id: 'end',
      time: episode.endedAt,
      label: 'Marked as better',
      sub: '',
      category: 'episode',
    })
  }

  items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  return items
}
