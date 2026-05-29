import { INSIGHTS_MIN_FEEDINGS, INSIGHTS_MIN_SLEEPS } from '@tracker/shared'

import { prisma } from '../lib/prisma'
import { anthropic } from '../lib/anthropic'
import { logAIUsage } from '../lib/aiGuards'

export type ParsedLogResult =
  | { type: 'feeding_bottle'; data: { volumeOz: number; milkType?: 'BREAST_MILK' | 'FORMULA'; formulaName?: string; fedAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'feeding_breast'; data: { side: 'BREAST_LEFT' | 'BREAST_RIGHT'; startedAt?: string; endedAt?: string; durationSec?: number; notes?: string }; summary: string; confidence: number }
  | { type: 'sleep'; data: { sleepType: 'NAP' | 'NIGHT'; startedAt?: string; endedAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'diaper'; data: { diaperType: 'WET' | 'DIRTY' | 'BOTH'; color?: string; consistency?: string; occurredAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'medication'; data: { name: string; dosageMg?: number; dosageNote?: string; givenAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'tummy_time'; data: { durationSec: number; startedAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'temperature'; data: { tempF?: number; tempC?: number; method?: string; recordedAt?: string; notes?: string }; summary: string; confidence: number }
  | { type: 'illness_start'; data: { symptoms?: string[]; tempF?: number; tempC?: number; notes?: string }; summary: string; confidence: number }
  | { type: 'unknown'; data: null; summary: string; confidence: number }

export async function parseNaturalLanguageLog(
  text: string,
  nowIso: string,
  ctx?: { babyId?: string; userId?: string },
): Promise<ParsedLogResult> {
  const systemPrompt = `You are a baby tracker assistant. Parse freeform text from a parent and return a JSON object describing a baby activity log entry.

Current time: ${nowIso}

Return ONLY valid JSON with this structure:
{
  "type": one of: "feeding_bottle" | "feeding_breast" | "sleep" | "diaper" | "medication" | "tummy_time" | "temperature" | "illness_start" | "unknown",
  "confidence": number 0-1,
  "summary": "short human-readable confirmation string, e.g. 'Bottle feed: 3 oz at 2:00 PM'",
  "data": { ... type-specific fields ... }
}

Type-specific data fields:
- feeding_bottle: { volumeOz: number, milkType?: "BREAST_MILK"|"FORMULA", formulaName?: string, fedAt?: ISO8601, notes?: string }
- feeding_breast: { side: "BREAST_LEFT"|"BREAST_RIGHT", startedAt?: ISO8601, endedAt?: ISO8601, durationSec?: number, notes?: string }
- sleep: { sleepType: "NAP"|"NIGHT", startedAt?: ISO8601, endedAt?: ISO8601, notes?: string }
- diaper: { diaperType: "WET"|"DIRTY"|"BOTH", color?: "YELLOW"|"GREEN"|"BROWN"|"BLACK"|"RED"|"OTHER", consistency?: "SEEDY"|"PASTY"|"RUNNY"|"FIRM"|"WATERY"|"CUSTOM", occurredAt?: ISO8601, notes?: string }
- medication: { name: string, dosageMg?: number, dosageNote?: string, givenAt?: ISO8601, notes?: string }
- tummy_time: { durationSec: number, startedAt?: ISO8601, notes?: string }
- temperature: { tempF?: number, tempC?: number, method?: "FOREHEAD"|"EAR"|"RECTAL"|"AXILLARY"|"ORAL", recordedAt?: ISO8601, notes?: string }
- illness_start: { symptoms?: string[], tempF?: number, tempC?: number, notes?: string }
- unknown: { }

Rules:
- Convert relative times ("just now", "10 minutes ago", "at 2pm") to absolute ISO8601 using current time
- "left side" / "left breast" → BREAST_LEFT; "right" → BREAST_RIGHT
- Infer sleepType: "nap" → NAP, "night sleep" / "bedtime" / default for evening hours → NIGHT
- If oz/ml given for sleep/diaper by mistake, still parse as the correct type
- Use temperature when the parent is recording a specific temperature reading (e.g. "baby's temp is 101.5", "took a temperature, 99.8°F", "thermometer said 38.2°C"). Include both tempF and tempC when the user specifies a unit — convert the other. Infer method from context ("ear thermometer" → EAR, "forehead" → FOREHEAD, "rectal" → RECTAL); default to FOREHEAD if unspecified.
- Use illness_start when the parent indicates the baby is sick or starting an illness WITHOUT giving a specific reading (e.g. "baby is sick", "baby seems unwell", "starting illness episode"). If a temperature value is also mentioned alongside illness ("baby sick with 101 fever"), use illness_start and include tempF in the data — both the episode and the temperature will be recorded.
- For illness_start, extract any mentioned symptoms as an array of short strings (e.g. ["fever", "runny nose", "fussy"])
- Return unknown if the text is not a recognizable baby activity
- Respond with JSON only, no markdown, no explanation`

  const model = 'claude-haiku-4-5-20251001'
  const message = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  })

  void logAIUsage({
    route: 'PARSE',
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    babyId: ctx?.babyId,
    userId: ctx?.userId,
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(json) as ParsedLogResult
}

export async function buildLogContext(babyId: string, days: number): Promise<string> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [feedings, sleeps, diapers, weights] = await Promise.all([
    prisma.feedingLog.findMany({
      where: { babyId, startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    prisma.sleepLog.findMany({
      where: { babyId, startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    prisma.diaperLog.findMany({
      where: { babyId, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    }),
    prisma.weightLog.findMany({
      where: { babyId },
      orderBy: { recordedAt: 'desc' },
      take: 3,
    }),
  ])

  const baby = await prisma.baby.findUnique({ where: { id: babyId } })
  const ageDesc = baby?.birthDate
    ? `${Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks old`
    : baby?.dueDate
    ? `due ${new Date(baby.dueDate).toLocaleDateString()}`
    : 'age unknown'

  const completedFeedings = feedings.filter((f) => f.endedAt || f.type === 'BOTTLE' || f.type === 'PUMP')
  const breastFeeds = completedFeedings.filter((f) => f.type === 'BREAST_LEFT' || f.type === 'BREAST_RIGHT')
  const bottleFeeds = completedFeedings.filter((f) => f.type === 'BOTTLE')
  const avgFeedsPerDay = (completedFeedings.length / days).toFixed(1)
  const avgBreastMin = breastFeeds.length
    ? Math.round(breastFeeds.reduce((s, f) => s + (f.durationSec ?? 0), 0) / breastFeeds.length / 60)
    : 0
  const totalOz = bottleFeeds.reduce((s, f) => s + (f.volumeOz ?? 0), 0).toFixed(1)

  const completedSleeps = sleeps.filter((s) => s.endedAt)
  const totalSleepMin = Math.round(
    completedSleeps.reduce((s, sl) => s + (new Date(sl.endedAt!).getTime() - new Date(sl.startedAt).getTime()), 0) / 60000,
  )
  const avgSleepPerDay = Math.round(totalSleepMin / days)
  const longestStretchMin = completedSleeps.reduce((max, s) => {
    const dur = Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000)
    return dur > max ? dur : max
  }, 0)

  const latestWeight = weights[0]
  const weightDesc = latestWeight
    ? `${latestWeight.lbs} lb ${latestWeight.oz.toFixed(1)} oz (recorded ${new Date(latestWeight.recordedAt).toLocaleDateString()})`
    : 'not recorded'

  return `Baby context (last ${days} days):
- Age: ${ageDesc}
- Latest weight: ${weightDesc}
- Feedings: ${completedFeedings.length} total (avg ${avgFeedsPerDay}/day); breast avg ${avgBreastMin} min; bottle total ${totalOz} oz
- Sleep: ${totalSleepMin} total minutes over ${days} days (avg ${avgSleepPerDay} min/day); longest stretch ${longestStretchMin} min
- Diapers: ${diapers.length} total (avg ${(diapers.length / days).toFixed(1)}/day)`
}

type SleepSlice = { startedAt: Date; endedAt: Date | null }

export function calcAvgIntervalMin(logs: { startedAt: Date }[], nowMs: number, cutoffMs: number): number {
  const cutLogs = logs.filter((l) => new Date(l.startedAt).getTime() >= nowMs - cutoffMs)
  if (cutLogs.length < 2) return 0
  let total = 0
  for (let i = 1; i < cutLogs.length; i++) {
    total += new Date(cutLogs[i].startedAt).getTime() - new Date(cutLogs[i - 1].startedAt).getTime()
  }
  return Math.round(total / (cutLogs.length - 1) / 60000)
}

export function calcSleepStats(sleeps: SleepSlice[]): {
  longestStretchMin: number
  avgDailySleepMin: number
  avgWakeWindowMin: number
} {
  const completed = sleeps.filter((s): s is SleepSlice & { endedAt: Date } => s.endedAt !== null)

  const totalSleepMs = completed.reduce(
    (s, sl) => s + (new Date(sl.endedAt).getTime() - new Date(sl.startedAt).getTime()),
    0,
  )
  const longestStretchMin = completed.reduce((max, s) => {
    const dur = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
    return dur > max ? dur : max
  }, 0)

  let totalWakeWindowMin = 0
  let wakeWindowCount = 0
  for (let i = 1; i < completed.length; i++) {
    const wakeMin = Math.round(
      (new Date(completed[i].startedAt).getTime() - new Date(completed[i - 1].endedAt).getTime()) / 60000,
    )
    if (wakeMin > 0 && wakeMin < 6 * 60) {
      totalWakeWindowMin += wakeMin
      wakeWindowCount++
    }
  }

  return {
    longestStretchMin,
    avgDailySleepMin: Math.round(totalSleepMs / 60000 / 7),
    avgWakeWindowMin: wakeWindowCount > 0 ? Math.round(totalWakeWindowMin / wakeWindowCount) : 0,
  }
}


export type InsightsResult = {
  feedingInterval: { avg24h: number; avg3d: number; avg7d: number }
  sleepPattern: { avgWakeWindowMin: number; longestStretchMin: number; avgDailySleepMin: number }
  summary: string
  insufficientData?: true
}

export async function generateInsights(babyId: string): Promise<InsightsResult> {
  const now = Date.now()

  const [feedings7d, sleeps7d] = await Promise.all([
    prisma.feedingLog.findMany({
      where: { babyId, startedAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.sleepLog.findMany({
      where: { babyId, startedAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }, endedAt: { not: null } },
      orderBy: { startedAt: 'asc' },
    }),
  ])

  const feedingInterval = {
    avg24h: calcAvgIntervalMin(feedings7d, now, 24 * 60 * 60 * 1000),
    avg3d: calcAvgIntervalMin(feedings7d, now, 3 * 24 * 60 * 60 * 1000),
    avg7d: calcAvgIntervalMin(feedings7d, now, 7 * 24 * 60 * 60 * 1000),
  }

  const sleepPattern = calcSleepStats(sleeps7d)

  // Don't call the API if either metric is too sparse to produce a meaningful summary.
  if (feedings7d.length < INSIGHTS_MIN_FEEDINGS || sleeps7d.length < INSIGHTS_MIN_SLEEPS) {
    return { feedingInterval, sleepPattern, summary: '', insufficientData: true }
  }

  const logContext = await buildLogContext(babyId, 7)
  const insightPrompt = `${logContext}

Feeding interval averages (minutes between feeds): 24h=${feedingInterval.avg24h}, 3d=${feedingInterval.avg3d}, 7d=${feedingInterval.avg7d}
Sleep: avg wake window ${sleepPattern.avgWakeWindowMin} min, longest stretch ${sleepPattern.longestStretchMin} min, avg daily sleep ${sleepPattern.avgDailySleepMin} min/day

Write a 2–3 sentence insight summary for the parents. Be specific, warm, and practical. No markdown. No medical advice.`

  const model = 'claude-haiku-4-5-20251001'
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 256,
    messages: [{ role: 'user', content: insightPrompt }],
  })

  void logAIUsage({
    route: 'INSIGHTS',
    model,
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    babyId,
  })

  const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''

  return { feedingInterval, sleepPattern, summary }
}

export async function generateWeeklySummaryText(babyId: string): Promise<{
  content: string
  totalFeeds: number
  totalSleepMin: number
  totalDiapers: number
  weightChangeOz: number | null
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [feedings, sleeps, diapers, weights] = await Promise.all([
    prisma.feedingLog.findMany({ where: { babyId, startedAt: { gte: since }, endedAt: { not: null } } }),
    prisma.sleepLog.findMany({ where: { babyId, startedAt: { gte: since }, endedAt: { not: null } } }),
    prisma.diaperLog.findMany({ where: { babyId, occurredAt: { gte: since } } }),
    prisma.weightLog.findMany({ where: { babyId }, orderBy: { recordedAt: 'desc' }, take: 2 }),
  ])

  const totalSleepMin = Math.round(
    sleeps.reduce((s, sl) => s + (new Date(sl.endedAt!).getTime() - new Date(sl.startedAt).getTime()), 0) / 60000,
  )

  let weightChangeOz: number | null = null
  if (weights.length >= 2) {
    const latest = weights[0].lbs * 16 + weights[0].oz
    const prev = weights[1].lbs * 16 + weights[1].oz
    weightChangeOz = Math.round((latest - prev) * 10) / 10
  }

  const logContext = await buildLogContext(babyId, 7)
  const prompt = `${logContext}

This week's data:
- Completed feeds: ${feedings.length}
- Total sleep: ${totalSleepMin} min (${Math.round(totalSleepMin / 60 * 10) / 10} hrs)
- Diapers: ${diapers.length}
${weightChangeOz !== null ? `- Weight change: ${weightChangeOz >= 0 ? '+' : ''}${weightChangeOz} oz` : ''}

Write a warm, specific weekly summary (3–4 sentences) for two parents to review together. Include highlights, any notable patterns, and one gentle observation. No medical advice. No markdown.`

  const model = 'claude-haiku-4-5-20251001'
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 384,
    messages: [{ role: 'user', content: prompt }],
  })

  void logAIUsage({
    route: 'WEEKLY',
    model,
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    babyId,
  })

  const content = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''

  return { content, totalFeeds: feedings.length, totalSleepMin, totalDiapers: diapers.length, weightChangeOz }
}

export async function getConversationHistory(
  babyId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>> {
  const logs = await prisma.aIConversationLog.findMany({
    where: { babyId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return logs.reverse().map((l) => ({
    role: l.role === 'USER' ? 'user' : 'assistant',
    content: l.content,
    createdAt: l.createdAt.toISOString(),
  }))
}
