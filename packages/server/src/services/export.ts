import type { ExportDataType, HealthSummarySection } from '@tracker/shared'
import { EXPORT_DATA_TYPE_LABELS, getVaccineByKey } from '@tracker/shared'
import { prisma } from '../lib/prisma'
import { localDayBoundsUTC } from '../lib/timezone'
import { PdfReportBuilder } from './report'

const TZ = process.env['TIMEZONE'] ?? 'UTC'

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtLocal(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
}

function fmtLocalDay(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(d)
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

// RFC 4180 CSV escaping
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  return lines.join('\n') + '\n'
}

export function rangeBounds(from: string, to: string): [Date, Date] {
  const [start] = localDayBoundsUTC(from)
  const [, end] = localDayBoundsUTC(to)
  return [start, end]
}

// ── Raw data fetch ──────────────────────────────────────────────────────────

export type RawExportData = Awaited<ReturnType<typeof fetchRawExportData>>

export async function fetchRawExportData(
  babyId: string,
  types: ExportDataType[],
  from: string,
  to: string,
) {
  const [start, end] = rangeBounds(from, to)
  const range = { gte: start, lte: end }
  const has = (t: ExportDataType) => types.includes(t)

  const [feedings, sleeps, diapers, weights, heights, medications, tummyTimes, moods, baby] =
    await Promise.all([
      has('feeding')
        ? prisma.feedingLog.findMany({ where: { babyId, startedAt: range }, orderBy: { startedAt: 'asc' } })
        : [],
      has('sleep')
        ? prisma.sleepLog.findMany({ where: { babyId, startedAt: range }, orderBy: { startedAt: 'asc' } })
        : [],
      has('diaper')
        ? prisma.diaperLog.findMany({ where: { babyId, occurredAt: range }, orderBy: { occurredAt: 'asc' } })
        : [],
      has('growth')
        ? prisma.weightLog.findMany({ where: { babyId, recordedAt: range }, orderBy: { recordedAt: 'asc' } })
        : [],
      has('growth')
        ? prisma.heightLog.findMany({ where: { babyId, recordedAt: range }, orderBy: { recordedAt: 'asc' } })
        : [],
      has('medication')
        ? prisma.medicationLog.findMany({ where: { babyId, givenAt: range }, orderBy: { givenAt: 'asc' } })
        : [],
      has('tummyTime')
        ? prisma.tummyTimeLog.findMany({ where: { babyId, startedAt: range }, orderBy: { startedAt: 'asc' } })
        : [],
      has('mood')
        ? prisma.moodLog.findMany({
            where: { babyId, occurredAt: range },
            orderBy: { occurredAt: 'asc' },
            include: { customActivity: { select: { name: true } } },
          })
        : [],
      prisma.baby.findUnique({ where: { id: babyId }, select: { name: true } }),
    ])

  return { feedings, sleeps, diapers, weights, heights, medications, tummyTimes, moods, baby }
}

export async function countExportRecords(
  babyId: string,
  types: ExportDataType[],
  from: string,
  to: string,
): Promise<Record<ExportDataType, number> & { total: number }> {
  const [start, end] = rangeBounds(from, to)
  const range = { gte: start, lte: end }
  const has = (t: ExportDataType) => types.includes(t)

  const [feeding, sleep, diaper, weight, height, medication, tummyTime, mood] = await Promise.all([
    has('feeding') ? prisma.feedingLog.count({ where: { babyId, startedAt: range } }) : 0,
    has('sleep') ? prisma.sleepLog.count({ where: { babyId, startedAt: range } }) : 0,
    has('diaper') ? prisma.diaperLog.count({ where: { babyId, occurredAt: range } }) : 0,
    has('growth') ? prisma.weightLog.count({ where: { babyId, recordedAt: range } }) : 0,
    has('growth') ? prisma.heightLog.count({ where: { babyId, recordedAt: range } }) : 0,
    has('medication') ? prisma.medicationLog.count({ where: { babyId, givenAt: range } }) : 0,
    has('tummyTime') ? prisma.tummyTimeLog.count({ where: { babyId, startedAt: range } }) : 0,
    has('mood') ? prisma.moodLog.count({ where: { babyId, occurredAt: range } }) : 0,
  ])

  const counts = {
    feeding,
    sleep,
    diaper,
    growth: weight + height,
    medication,
    tummyTime,
    mood,
  }
  return { ...counts, total: Object.values(counts).reduce((s, n) => s + n, 0) }
}

// ── CSV builders ────────────────────────────────────────────────────────────

export function buildCsvFiles(data: RawExportData, types: ExportDataType[]): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = []
  const iso = (d: Date) => d.toISOString()

  if (types.includes('feeding')) {
    files.push({
      name: 'feedings.csv',
      content: toCsv(
        ['startedAt', 'endedAt', 'type', 'durationSec', 'volumeOz', 'milkType', 'formulaName', 'notes'],
        data.feedings.map((f) => [
          iso(f.startedAt), f.endedAt ? iso(f.endedAt) : null, f.type,
          f.durationSec, f.volumeOz, f.milkType, f.formulaName, f.notes,
        ]),
      ),
    })
  }
  if (types.includes('sleep')) {
    files.push({
      name: 'sleep.csv',
      content: toCsv(
        ['startedAt', 'endedAt', 'type', 'notes'],
        data.sleeps.map((s) => [iso(s.startedAt), s.endedAt ? iso(s.endedAt) : null, s.type, s.notes]),
      ),
    })
  }
  if (types.includes('diaper')) {
    files.push({
      name: 'diapers.csv',
      content: toCsv(
        ['occurredAt', 'type', 'color', 'consistency', 'customConsistency', 'notes'],
        data.diapers.map((d) => [iso(d.occurredAt), d.type, d.color, d.consistency, d.customConsistency, d.notes]),
      ),
    })
  }
  if (types.includes('growth')) {
    files.push({
      name: 'weight.csv',
      content: toCsv(
        ['recordedAt', 'lbs', 'oz', 'notes'],
        data.weights.map((w) => [iso(w.recordedAt), w.lbs, w.oz, w.notes]),
      ),
    })
    files.push({
      name: 'height.csv',
      content: toCsv(
        ['recordedAt', 'inches', 'notes'],
        data.heights.map((h) => [iso(h.recordedAt), h.inches, h.notes]),
      ),
    })
  }
  if (types.includes('medication')) {
    files.push({
      name: 'medications.csv',
      content: toCsv(
        ['givenAt', 'name', 'dosageMg', 'dosageNote', 'notes'],
        data.medications.map((m) => [iso(m.givenAt), m.name, m.dosageMg, m.dosageNote, m.notes]),
      ),
    })
  }
  if (types.includes('tummyTime')) {
    files.push({
      name: 'tummy-time.csv',
      content: toCsv(
        ['startedAt', 'endedAt', 'durationSec', 'notes'],
        data.tummyTimes.map((t) => [iso(t.startedAt), t.endedAt ? iso(t.endedAt) : null, t.durationSec, t.notes]),
      ),
    })
  }
  if (types.includes('mood')) {
    files.push({
      name: 'mood-activity.csv',
      content: toCsv(
        ['occurredAt', 'mood', 'qualifier', 'customActivity', 'notes'],
        data.moods.map((m) => [iso(m.occurredAt), m.mood, m.qualifier, m.customActivity?.name, m.notes]),
      ),
    })
  }
  return files
}

// ── Raw data PDF ────────────────────────────────────────────────────────────

export async function buildRawDataPdf(
  data: RawExportData,
  types: ExportDataType[],
  from: string,
  to: string,
): Promise<Buffer> {
  const pdf = new PdfReportBuilder()
  pdf.addReportHeader(
    'Data Export',
    data.baby?.name ? `${data.baby.name} — daily log export` : 'Daily log export',
    [
      ['Date range:', `${fmtLocalDay(rangeBounds(from, to)[0])} – ${fmtLocalDay(rangeBounds(from, to)[1])}`],
      ['Generated:', fmtLocal(new Date())],
      ['Included:', types.map((t) => EXPORT_DATA_TYPE_LABELS[t]).join(', ')],
    ],
  )

  if (types.includes('feeding') && data.feedings.length > 0) {
    pdf.addSectionHeading(`Feedings (${data.feedings.length})`)
    pdf.addTable(
      ['Time', 'Type', 'Duration', 'Volume', 'Notes'],
      data.feedings.map((f) => [
        fmtLocal(f.startedAt),
        f.type.replace(/_/g, ' ').toLowerCase(),
        f.durationSec ? fmtDuration(f.durationSec) : '',
        f.volumeOz ? `${f.volumeOz} oz` : '',
        f.notes ?? '',
      ]),
      [95, 85, 65, 65, 202],
    )
  }
  if (types.includes('sleep') && data.sleeps.length > 0) {
    pdf.addSectionHeading(`Sleep (${data.sleeps.length})`)
    pdf.addTable(
      ['Start', 'End', 'Type', 'Duration', 'Notes'],
      data.sleeps.map((s) => [
        fmtLocal(s.startedAt),
        s.endedAt ? fmtLocal(s.endedAt) : 'ongoing',
        s.type.toLowerCase(),
        s.endedAt ? fmtDuration((s.endedAt.getTime() - s.startedAt.getTime()) / 1000) : '',
        s.notes ?? '',
      ]),
      [95, 95, 55, 65, 202],
    )
  }
  if (types.includes('diaper') && data.diapers.length > 0) {
    pdf.addSectionHeading(`Diapers (${data.diapers.length})`)
    pdf.addTable(
      ['Time', 'Type', 'Color', 'Consistency', 'Notes'],
      data.diapers.map((d) => [
        fmtLocal(d.occurredAt),
        d.type.toLowerCase(),
        d.color?.toLowerCase() ?? '',
        d.consistency === 'CUSTOM' ? (d.customConsistency ?? 'custom') : (d.consistency?.toLowerCase() ?? ''),
        d.notes ?? '',
      ]),
      [95, 60, 65, 90, 202],
    )
  }
  if (types.includes('growth') && (data.weights.length > 0 || data.heights.length > 0)) {
    pdf.addSectionHeading(`Weight & Height (${data.weights.length + data.heights.length})`)
    if (data.weights.length > 0) {
      pdf.addTable(
        ['Date', 'Weight', 'Notes'],
        data.weights.map((w) => [fmtLocalDay(w.recordedAt), `${w.lbs} lb ${w.oz} oz`, w.notes ?? '']),
        [110, 110, 292],
      )
    }
    if (data.heights.length > 0) {
      pdf.addTable(
        ['Date', 'Height', 'Notes'],
        data.heights.map((h) => [fmtLocalDay(h.recordedAt), `${h.inches} in`, h.notes ?? '']),
        [110, 110, 292],
      )
    }
  }
  if (types.includes('medication') && data.medications.length > 0) {
    pdf.addSectionHeading(`Medications (${data.medications.length})`)
    pdf.addTable(
      ['Time', 'Medication', 'Dose', 'Notes'],
      data.medications.map((m) => [
        fmtLocal(m.givenAt),
        m.name,
        m.dosageMg ? `${m.dosageMg} mg` : (m.dosageNote ?? ''),
        m.notes ?? '',
      ]),
      [95, 130, 90, 197],
    )
  }
  if (types.includes('tummyTime') && data.tummyTimes.length > 0) {
    pdf.addSectionHeading(`Tummy Time (${data.tummyTimes.length})`)
    pdf.addTable(
      ['Time', 'Duration', 'Notes'],
      data.tummyTimes.map((t) => [
        fmtLocal(t.startedAt),
        t.durationSec ? fmtDuration(t.durationSec) : '',
        t.notes ?? '',
      ]),
      [110, 90, 312],
    )
  }
  if (types.includes('mood') && data.moods.length > 0) {
    pdf.addSectionHeading(`Mood & Activity (${data.moods.length})`)
    pdf.addTable(
      ['Time', 'Mood / Activity', 'Notes'],
      data.moods.map((m) => [
        fmtLocal(m.occurredAt),
        [m.mood, m.qualifier, m.customActivity?.name].filter(Boolean).join(' · ').toLowerCase(),
        m.notes ?? '',
      ]),
      [110, 150, 252],
    )
  }

  return pdf.toBuffer()
}

// ── Health summary ──────────────────────────────────────────────────────────

const DAYS_30 = 30 * 24 * 3600 * 1000

export async function buildHealthSummaryPdf(
  babyId: string,
  sections: HealthSummarySection[],
): Promise<Buffer | null> {
  const baby = await prisma.baby.findUnique({
    where: { id: babyId },
    select: { name: true, birthDate: true },
  })
  if (!baby) return null

  const since30 = new Date(Date.now() - DAYS_30)
  const has = (s: HealthSummarySection) => sections.includes(s)

  const [vaccinations, medications, weights, heights, feedings, sleeps] = await Promise.all([
    has('vaccinations')
      ? prisma.vaccinationRecord.findMany({ where: { babyId }, orderBy: { administeredAt: 'asc' } })
      : [],
    has('medications')
      ? prisma.medicationLog.findMany({ where: { babyId, givenAt: { gte: since30 } }, orderBy: { givenAt: 'desc' } })
      : [],
    has('growth')
      ? prisma.weightLog.findMany({ where: { babyId }, orderBy: { recordedAt: 'desc' }, take: 5 })
      : [],
    has('growth')
      ? prisma.heightLog.findMany({ where: { babyId }, orderBy: { recordedAt: 'desc' }, take: 5 })
      : [],
    has('feeding')
      ? prisma.feedingLog.findMany({ where: { babyId, startedAt: { gte: since30 } } })
      : [],
    has('sleep')
      ? prisma.sleepLog.findMany({ where: { babyId, startedAt: { gte: since30 }, endedAt: { not: null } } })
      : [],
  ])

  const pdf = new PdfReportBuilder(
    'This is an informal record generated by a private family app — not an official medical document.',
  )
  pdf.addReportHeader(
    'Health Summary',
    baby.name ?? 'Baby',
    [
      ...(baby.birthDate ? [['Date of birth:', fmtLocalDay(baby.birthDate)] as [string, string]] : []),
      ['Generated:', fmtLocal(new Date())],
    ],
  )

  if (has('vaccinations') && vaccinations.length > 0) {
    pdf.addSectionHeading(`Vaccinations Received (${vaccinations.length})`)
    pdf.addTable(
      ['Date', 'Vaccine', 'Lot #', 'Provider'],
      vaccinations.map((v) => {
        const entry = getVaccineByKey(v.vaccineKey)
        return [
          fmtLocalDay(v.administeredAt),
          entry ? `${entry.name} — dose ${entry.doseNumber}` : v.vaccineKey,
          v.lotNumber ?? '',
          v.provider ?? '',
        ]
      }),
      [90, 220, 90, 112],
    )
  }

  if (has('medications') && medications.length > 0) {
    // Collapse to one row per distinct medication with most recent dose
    const byName = new Map<string, (typeof medications)[number] & { count: number }>()
    for (const m of medications) {
      const existing = byName.get(m.name)
      if (existing) existing.count += 1
      else byName.set(m.name, { ...m, count: 1 })
    }
    pdf.addSectionHeading('Current Medications (last 30 days)')
    pdf.addTable(
      ['Medication', 'Dose', 'Last given', 'Times (30d)'],
      [...byName.values()].map((m) => [
        m.name,
        m.dosageMg ? `${m.dosageMg} mg` : (m.dosageNote ?? ''),
        fmtLocal(m.givenAt),
        String(m.count),
      ]),
      [170, 100, 140, 102],
    )
  }

  if (has('growth') && (weights.length > 0 || heights.length > 0)) {
    pdf.addSectionHeading('Recent Weight & Growth')
    const lines: string[] = []
    if (weights.length > 0) {
      const latest = weights[0]!
      lines.push(`Current weight: ${latest.lbs} lb ${latest.oz} oz (recorded ${fmtLocalDay(latest.recordedAt)})`)
      if (weights.length > 1) {
        const prev = weights[1]!
        const deltaOz = latest.lbs * 16 + latest.oz - (prev.lbs * 16 + prev.oz)
        const sign = deltaOz >= 0 ? '+' : '−'
        lines.push(`Change since previous (${fmtLocalDay(prev.recordedAt)}): ${sign}${Math.abs(deltaOz).toFixed(1)} oz`)
      }
    }
    if (heights.length > 0) {
      const latest = heights[0]!
      lines.push(`Current height: ${latest.inches} in (recorded ${fmtLocalDay(latest.recordedAt)})`)
    }
    pdf.addBulletList(lines)
  }

  if (has('feeding') && feedings.length > 0) {
    const bottle = feedings.filter((f) => f.type === 'BOTTLE')
    const breast = feedings.filter((f) => f.type === 'BREAST_LEFT' || f.type === 'BREAST_RIGHT')
    const totalVol = bottle.reduce((s, f) => s + (f.volumeOz ?? 0), 0)
    pdf.addSectionHeading('Feeding Overview (last 30 days)')
    pdf.addBulletList([
      `Total feeds: ${feedings.length} (${(feedings.length / 30).toFixed(1)} per day average)`,
      `Breast: ${breast.length} · Bottle: ${bottle.length}`,
      ...(bottle.length > 0
        ? [`Average bottle volume: ${(totalVol / bottle.length).toFixed(1)} oz`]
        : []),
    ])
  }

  if (has('sleep') && sleeps.length > 0) {
    const durations = sleeps.map((s) => (s.endedAt!.getTime() - s.startedAt.getTime()) / 1000)
    const totalSec = durations.reduce((a, b) => a + b, 0)
    const longest = Math.max(...durations)
    pdf.addSectionHeading('Sleep Overview (last 30 days)')
    pdf.addBulletList([
      `Average sleep per day: ${fmtDuration(totalSec / 30)}`,
      `Longest stretch: ${fmtDuration(longest)}`,
      `Sleep sessions logged: ${sleeps.length}`,
    ])
  }

  return pdf.toBuffer()
}
