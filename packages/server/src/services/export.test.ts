import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    feedingLog: { findMany: vi.fn(), count: vi.fn() },
    sleepLog: { findMany: vi.fn(), count: vi.fn() },
    diaperLog: { findMany: vi.fn(), count: vi.fn() },
    weightLog: { findMany: vi.fn(), count: vi.fn() },
    heightLog: { findMany: vi.fn(), count: vi.fn() },
    medicationLog: { findMany: vi.fn(), count: vi.fn() },
    tummyTimeLog: { findMany: vi.fn(), count: vi.fn() },
    moodLog: { findMany: vi.fn(), count: vi.fn() },
    vaccinationRecord: { findMany: vi.fn() },
    baby: { findUnique: vi.fn() },
  },
}))

import { prisma } from '../lib/prisma'
import { csvCell, toCsv, buildCsvFiles, countExportRecords, rangeBounds, fmtDuration } from './export'
import type { RawExportData } from './export'

const mocked = vi.mocked

describe('csvCell', () => {
  it('returns empty string for null and undefined', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('passes through plain values', () => {
    expect(csvCell('BOTTLE')).toBe('BOTTLE')
    expect(csvCell(3.5)).toBe('3.5')
  })

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(csvCell('burped, then slept')).toBe('"burped, then slept"')
    expect(csvCell('she said "more"')).toBe('"she said ""more"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('toCsv', () => {
  it('emits header row plus one line per record with trailing newline', () => {
    const csv = toCsv(['a', 'b'], [['1', '2'], ['3', null]])
    expect(csv).toBe('a,b\n1,2\n3,\n')
  })
})

describe('fmtDuration', () => {
  it('formats sub-hour durations as minutes', () => {
    expect(fmtDuration(25 * 60)).toBe('25m')
  })
  it('formats hour-plus durations as h + m', () => {
    expect(fmtDuration(2 * 3600 + 14 * 60)).toBe('2h 14m')
  })
})

describe('rangeBounds', () => {
  it('returns start <= end spanning the full range', () => {
    const [start, end] = rangeBounds('2026-06-01', '2026-06-07')
    expect(start.getTime()).toBeLessThan(end.getTime())
    // 7 local days minus the final second-ish
    expect(end.getTime() - start.getTime()).toBeGreaterThan(6.9 * 86400000)
  })
})

const emptyData: RawExportData = {
  feedings: [], sleeps: [], diapers: [], weights: [], heights: [],
  medications: [], tummyTimes: [], moods: [], baby: { name: 'Tess' },
}

describe('buildCsvFiles', () => {
  it('emits one file per selected type, none for unselected', () => {
    const files = buildCsvFiles(emptyData, ['feeding', 'sleep'])
    expect(files.map((f) => f.name)).toEqual(['feedings.csv', 'sleep.csv'])
  })

  it('growth produces both weight and height files', () => {
    const files = buildCsvFiles(emptyData, ['growth'])
    expect(files.map((f) => f.name)).toEqual(['weight.csv', 'height.csv'])
  })

  it('serialises feeding rows with UTC timestamps', () => {
    const data: RawExportData = {
      ...emptyData,
      feedings: [{
        id: 'f1', babyId: 'b1', loggedById: 'u1', type: 'BOTTLE',
        startedAt: new Date('2026-06-01T14:30:00Z'), endedAt: null,
        durationSec: null, volumeOz: 3.5, milkType: 'Formula', formulaName: null,
        notes: 'burped, well', sicknessEpisodeId: null, createdAt: new Date(),
      }],
    }
    const [file] = buildCsvFiles(data, ['feeding'])
    expect(file!.content).toContain('2026-06-01T14:30:00.000Z')
    expect(file!.content).toContain('"burped, well"')
    expect(file!.content.split('\n')[0]).toBe('startedAt,endedAt,type,durationSec,volumeOz,milkType,formulaName,notes')
  })
})

describe('countExportRecords', () => {
  it('sums counts across selected types and skips unselected ones', async () => {
    mocked(prisma.feedingLog.count).mockResolvedValue(10)
    mocked(prisma.sleepLog.count).mockResolvedValue(5)
    mocked(prisma.weightLog.count).mockResolvedValue(2)
    mocked(prisma.heightLog.count).mockResolvedValue(1)

    const counts = await countExportRecords('b1', ['feeding', 'sleep', 'growth'], '2026-06-01', '2026-06-07')

    expect(counts.feeding).toBe(10)
    expect(counts.sleep).toBe(5)
    expect(counts.growth).toBe(3)
    expect(counts.diaper).toBe(0)
    expect(counts.total).toBe(18)
    expect(prisma.diaperLog.count).not.toHaveBeenCalled()
  })
})
