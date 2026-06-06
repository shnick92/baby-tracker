import { prisma } from '../lib/prisma'
import { PdfReportBuilder, textSectionHeading, textKeyValue, textDivider } from './report'

// ── Data shape ──────────────────────────────────────────────────────────────

export type IllnessReportData = {
  episodeId: string
  babyName: string | null
  reporterName: string
  startedAt: Date
  endedAt: Date | null
  notes: string | null
  symptoms: Array<{ label: string }>
  temperatureLogs: Array<{
    tempF: number
    method: string
    recordedAt: Date
    notes: string | null
  }>
  medicationLogs: Array<{
    name: string
    dosageNote: string | null
    dosageMg: number | null
    givenAt: Date
    notes: string | null
  }>
  feedingLogs: Array<{
    type: string
    startedAt: Date
    endedAt: Date | null
    volumeOz: number | null
    durationSec: number | null
    notes: string | null
  }>
  sleepLogs: Array<{
    type: string
    startedAt: Date
    endedAt: Date | null
    notes: string | null
  }>
  diaperLogs: Array<{
    type: string
    occurredAt: Date
    notes: string | null
  }>
  moodLogs: Array<{
    mood: string | null
    occurredAt: Date
    notes: string | null
  }>
}

// ── DB query ─────────────────────────────────────────────────────────────────

export async function fetchIllnessReportData(episodeId: string): Promise<IllnessReportData | null> {
  const episode = await prisma.sicknessEpisode.findUnique({
    where: { id: episodeId },
    include: {
      baby: { select: { name: true } },
      symptoms: { orderBy: { createdAt: 'asc' } },
      temperatureLogs: { orderBy: { recordedAt: 'asc' } },
      medicationLogs: { orderBy: { givenAt: 'asc' } },
      feedingLogs: { orderBy: { startedAt: 'asc' } },
      sleepLogs: { orderBy: { startedAt: 'asc' } },
      diaperLogs: { orderBy: { occurredAt: 'asc' } },
      moodLogs: { orderBy: { occurredAt: 'asc' } },
    },
  })

  if (!episode) return null

  const reporter = await prisma.user.findUnique({
    where: { id: episode.startedById },
    select: { name: true },
  })

  return {
    episodeId: episode.id,
    babyName: episode.baby.name,
    reporterName: reporter?.name ?? 'Unknown',
    startedAt: episode.startedAt,
    endedAt: episode.endedAt,
    notes: episode.notes,
    symptoms: episode.symptoms,
    temperatureLogs: episode.temperatureLogs,
    medicationLogs: episode.medicationLogs,
    feedingLogs: episode.feedingLogs,
    sleepLogs: episode.sleepLogs,
    diaperLogs: episode.diaperLogs,
    moodLogs: episode.moodLogs,
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  FOREHEAD: 'Forehead',
  EAR: 'Ear',
  RECTAL: 'Rectal',
  AXILLARY: 'Armpit',
  ORAL: 'Oral',
}

const FEEDING_TYPE_LABELS: Record<string, string> = {
  BOTTLE: 'Bottle',
  BREAST_LEFT: 'Breast (Left)',
  BREAST_RIGHT: 'Breast (Right)',
}

const DIAPER_TYPE_LABELS: Record<string, string> = {
  WET: 'Wet',
  DIRTY: 'Dirty',
  BOTH: 'Wet + Dirty',
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDatetime(d: Date): string {
  return `${fmtDate(d)} at ${fmtTime(d)}`
}

function fmtTempF(f: number): string {
  const c = ((f - 32) * 5) / 9
  return `${f.toFixed(1)}°F  (${c.toFixed(1)}°C)`
}

function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

function peakTemp(logs: IllnessReportData['temperatureLogs']): number | null {
  if (logs.length === 0) return null
  return Math.max(...logs.map((l) => l.tempF))
}

type ChronologicalEntry = {
  time: Date
  category: string
  label: string
  sub?: string
}

function buildChronologicalLog(data: IllnessReportData): ChronologicalEntry[] {
  const entries: ChronologicalEntry[] = []

  for (const f of data.feedingLogs) {
    const typeLabel = FEEDING_TYPE_LABELS[f.type] ?? f.type
    let sub: string | undefined
    if (f.volumeOz) sub = `${f.volumeOz} oz`
    else if (f.durationSec) sub = fmtDuration(f.durationSec * 1000)
    entries.push({ time: f.startedAt, category: 'Feeding', label: typeLabel, sub })
  }

  for (const s of data.sleepLogs) {
    const typeLabel = s.type === 'NIGHT' ? 'Night Sleep' : 'Nap'
    const sub = s.endedAt ? fmtDuration(s.endedAt.getTime() - s.startedAt.getTime()) : 'ongoing'
    entries.push({ time: s.startedAt, category: 'Sleep', label: typeLabel, sub })
  }

  for (const d of data.diaperLogs) {
    entries.push({ time: d.occurredAt, category: 'Diaper', label: DIAPER_TYPE_LABELS[d.type] ?? d.type })
  }

  for (const m of data.medicationLogs) {
    const sub = m.dosageNote ?? (m.dosageMg ? `${m.dosageMg} mg` : undefined)
    entries.push({ time: m.givenAt, category: 'Medication', label: m.name, sub })
  }

  for (const t of data.temperatureLogs) {
    entries.push({ time: t.recordedAt, category: 'Temperature', label: fmtTempF(t.tempF), sub: METHOD_LABELS[t.method] })
  }

  for (const mood of data.moodLogs) {
    entries.push({ time: mood.occurredAt, category: 'Mood', label: mood.mood ?? 'Mood log', sub: mood.notes ?? undefined })
  }

  entries.sort((a, b) => a.time.getTime() - b.time.getTime())
  return entries
}

// ── Text renderer ─────────────────────────────────────────────────────────────

export function renderIllnessReportText(data: IllnessReportData): string {
  const lines: string[] = []
  const status = data.endedAt ? 'Resolved' : 'Ongoing'
  const babyLabel = data.babyName ?? 'Baby'
  const peak = peakTemp(data.temperatureLogs)

  lines.push('DOCTOR HANDOFF REPORT')
  lines.push(`${babyLabel} — Illness Episode`)
  lines.push(`Generated: ${fmtDatetime(new Date())}`)
  lines.push(textDivider())

  lines.push(textSectionHeading('Episode Summary'))
  lines.push(textKeyValue('Status:', status))
  lines.push(textKeyValue('Started:', fmtDatetime(data.startedAt)))
  if (data.endedAt) {
    lines.push(textKeyValue('Ended:', fmtDatetime(data.endedAt)))
    lines.push(textKeyValue('Duration:', fmtDuration(data.endedAt.getTime() - data.startedAt.getTime())))
  }
  lines.push(textKeyValue('Reported by:', data.reporterName))
  if (peak !== null) lines.push(textKeyValue('Peak temp:', fmtTempF(peak)))

  if (data.symptoms.length > 0) {
    lines.push(textSectionHeading('Symptoms'))
    for (const s of data.symptoms) lines.push(`  • ${s.label}`)
  }

  if (data.temperatureLogs.length > 0) {
    lines.push(textSectionHeading('Temperature Log'))
    for (const t of data.temperatureLogs) {
      const method = METHOD_LABELS[t.method] ?? t.method
      lines.push(`  ${fmtDatetime(t.recordedAt).padEnd(30)}  ${fmtTempF(t.tempF).padEnd(24)}  ${method}`)
    }
  }

  if (data.medicationLogs.length > 0) {
    lines.push(textSectionHeading('Medications'))
    const grouped = new Map<string, typeof data.medicationLogs>()
    for (const m of data.medicationLogs) {
      const key = m.dosageNote ? `${m.name} (${m.dosageNote})` : m.name
      const group = grouped.get(key) ?? []
      group.push(m)
      grouped.set(key, group)
    }
    for (const [medLabel, doses] of grouped) {
      lines.push(`  ${medLabel}`)
      for (const d of doses) {
        lines.push(`    ${fmtDatetime(d.givenAt)}${d.notes ? `  — ${d.notes}` : ''}`)
      }
    }
  }

  const chronLog = buildChronologicalLog(data)
  if (chronLog.length > 0) {
    lines.push(textSectionHeading('Chronological Log'))
    let currentDay = ''
    for (const entry of chronLog) {
      const day = fmtDate(entry.time)
      if (day !== currentDay) {
        lines.push(`\n  ${day}`)
        currentDay = day
      }
      const timePart = fmtTime(entry.time).padEnd(10)
      const catPart = entry.category.padEnd(12)
      const labelPart = entry.label + (entry.sub ? ` — ${entry.sub}` : '')
      lines.push(`    ${timePart}  ${catPart}  ${labelPart}`)
    }
  }

  if (data.notes) {
    lines.push(textSectionHeading('Notes'))
    lines.push(`  ${data.notes}`)
  }

  lines.push(`\n${textDivider()}`)
  lines.push('Generated by private family tracker — not an official medical record.')

  return lines.join('\n')
}

// ── PDF renderer ──────────────────────────────────────────────────────────────

export async function renderIllnessReportPdf(data: IllnessReportData): Promise<Buffer> {
  const status = data.endedAt ? 'Resolved' : 'Ongoing'
  const babyLabel = data.babyName ?? 'Baby'
  const peak = peakTemp(data.temperatureLogs)

  const subtitle = `${babyLabel} — Illness Episode`
  const meta: Array<[string, string]> = [
    ['Status:', status],
    ['Started:', fmtDatetime(data.startedAt)],
  ]
  if (data.endedAt) {
    meta.push(['Ended:', fmtDatetime(data.endedAt)])
    meta.push(['Duration:', fmtDuration(data.endedAt.getTime() - data.startedAt.getTime())])
  }
  meta.push(['Reported by:', data.reporterName])
  if (peak !== null) meta.push(['Peak temperature:', fmtTempF(peak)])
  meta.push(['Generated:', fmtDatetime(new Date())])

  const builder = new PdfReportBuilder()
  builder.addReportHeader('Doctor Handoff Report', subtitle, meta)

  if (data.symptoms.length > 0) {
    builder.addSectionHeading('Symptoms')
    builder.addBulletList(data.symptoms.map((s) => s.label))
  }

  if (data.temperatureLogs.length > 0) {
    builder.addSectionHeading('Temperature Log')
    const rows = data.temperatureLogs.map((t) => [
      fmtDatetime(t.recordedAt),
      fmtTempF(t.tempF),
      METHOD_LABELS[t.method] ?? t.method,
      t.notes ?? '',
    ])
    builder.addTable(['Date / Time', 'Temperature', 'Method', 'Notes'], rows, [160, 130, 90, 130])
  }

  if (data.medicationLogs.length > 0) {
    builder.addSectionHeading('Medications')
    const rows = data.medicationLogs.map((m) => {
      const dose = m.dosageNote ?? (m.dosageMg ? `${m.dosageMg} mg` : '')
      const medicineName = dose ? `${m.name} (${dose})` : m.name
      return [medicineName, fmtDatetime(m.givenAt), m.notes ?? '']
    })
    builder.addTable(['Medicine', 'Given At', 'Notes'], rows, [180, 160, 172])
  }

  const chronLog = buildChronologicalLog(data)
  if (chronLog.length > 0) {
    builder.addSectionHeading('Chronological Log')
    const rows = chronLog.map((entry) => [
      fmtDatetime(entry.time),
      entry.category,
      entry.label + (entry.sub ? ` — ${entry.sub}` : ''),
    ])
    builder.addTable(['Date / Time', 'Category', 'Detail'], rows, [160, 90, 260])
  }

  if (data.notes) {
    builder.addSectionHeading('Notes')
    builder.addTextBlock(data.notes)
  }

  return builder.toBuffer()
}
