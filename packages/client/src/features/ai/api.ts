import { api } from '@lib/axios'

export type ParsedLogType =
  | 'feeding_bottle'
  | 'feeding_breast'
  | 'sleep'
  | 'diaper'
  | 'medication'
  | 'tummy_time'
  | 'unknown'

export interface ParsedLogResult {
  type: ParsedLogType
  summary: string
  confidence: number
  data: Record<string, unknown>
}

export interface Insights {
  feedingInterval: { avg24h: number; avg3d: number; avg7d: number }
  sleepPattern: { avgWakeWindowMin: number; longestStretchMin: number; avgDailySleepMin: number }
  summary: string
}

export interface WeeklySummary {
  id: string
  weekOf: string
  content: string
  totalFeeds: number | null
  totalSleepMin: number | null
  totalDiapers: number | null
  weightChangeOz: number | null
  createdAt: string
}

export async function parseLog(text: string, babyId: string): Promise<ParsedLogResult> {
  const res = await api.post<{ data: ParsedLogResult; error: null }>('/api/ai/log', { text, babyId })
  return res.data.data
}

export async function fetchInsights(babyId: string): Promise<Insights> {
  const res = await api.get<{ data: Insights; error: null }>('/api/ai/insights', { params: { babyId } })
  return res.data.data
}

export async function fetchWeeklySummaries(babyId: string): Promise<WeeklySummary[]> {
  const res = await api.get<{ data: WeeklySummary[]; error: null }>('/api/ai/weekly-summary', { params: { babyId } })
  return res.data.data
}

// After NL parsing, commit the log to the appropriate API endpoint
export async function commitParsedLog(
  babyId: string,
  result: ParsedLogResult,
): Promise<void> {
  const d = result.data

  switch (result.type) {
    case 'feeding_bottle':
      await api.post('/api/feeding/bottle', {
        babyId,
        volumeOz: d['volumeOz'],
        milkType: d['milkType'] ?? 'BREAST_MILK',
        formulaName: d['formulaName'],
        fedAt: d['fedAt'] ?? new Date().toISOString(),
        notes: d['notes'],
      })
      break

    case 'feeding_breast': {
      const startRes = await api.post<{ data: { id: string }; error: null }>('/api/feeding/start', {
        babyId,
        type: d['side'] ?? 'BREAST_LEFT',
        startedAt: d['startedAt'] ?? new Date().toISOString(),
      })
      const feedId = startRes.data.data.id
      const endedAt = d['endedAt']
        ? d['endedAt']
        : d['durationSec']
        ? new Date(
            new Date(d['startedAt'] as string ?? new Date()).getTime() +
              (d['durationSec'] as number) * 1000,
          ).toISOString()
        : new Date().toISOString()
      await api.patch(`/api/feeding/${feedId}/end`, { endedAt })
      break
    }

    case 'sleep': {
      const sleepRes = await api.post<{ data: { id: string }; error: null }>('/api/sleep/start', {
        babyId,
        type: d['sleepType'] ?? 'NAP',
        startedAt: d['startedAt'] ?? new Date().toISOString(),
      })
      const sleepId = sleepRes.data.data.id
      const sleepEndedAt = d['endedAt'] ?? new Date().toISOString()
      await api.patch(`/api/sleep/${sleepId}/end`, { endedAt: sleepEndedAt })
      break
    }

    case 'diaper':
      await api.post('/api/diaper', {
        babyId,
        type: d['diaperType'] ?? 'WET',
        color: d['color'],
        consistency: d['consistency'],
        occurredAt: d['occurredAt'] ?? new Date().toISOString(),
        notes: d['notes'],
      })
      break

    case 'medication':
      await api.post('/api/medication', {
        babyId,
        name: d['name'] ?? '',
        dosageMg: d['dosageMg'],
        dosageNote: d['dosageNote'],
        givenAt: d['givenAt'] ?? new Date().toISOString(),
        notes: d['notes'],
      })
      break

    case 'tummy_time': {
      const ttRes = await api.post<{ data: { id: string }; error: null }>('/api/tummy-time/start', {
        babyId,
        startedAt: d['startedAt'] ?? new Date().toISOString(),
      })
      const ttId = ttRes.data.data.id
      const ttDuration = (d['durationSec'] as number) ?? 60
      const ttEndedAt = d['startedAt']
        ? new Date(new Date(d['startedAt'] as string).getTime() + ttDuration * 1000).toISOString()
        : new Date().toISOString()
      await api.patch(`/api/tummy-time/${ttId}/end`, { endedAt: ttEndedAt })
      break
    }

    default:
      throw new Error('Unknown log type')
  }
}
