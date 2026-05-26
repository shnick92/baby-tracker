import { describe, it, expect } from 'vitest'
import { calcAvgIntervalMin, calcSleepStats } from './ai'

const NOW = 1_750_000_000_000

function at(msAgo: number): Date {
  return new Date(NOW - msAgo)
}

const MIN = 60_000
const HR = 60 * MIN

// ---------------------------------------------------------------------------
// calcAvgIntervalMin
// ---------------------------------------------------------------------------

describe('calcAvgIntervalMin', () => {
  it('returns 0 when fewer than 2 logs', () => {
    expect(calcAvgIntervalMin([], NOW, 24 * HR)).toBe(0)
    expect(calcAvgIntervalMin([{ startedAt: at(0) }], NOW, 24 * HR)).toBe(0)
  })

  it('returns 0 when no logs fall within the cutoff window', () => {
    const logs = [{ startedAt: at(25 * HR) }, { startedAt: at(26 * HR) }]
    expect(calcAvgIntervalMin(logs, NOW, 24 * HR)).toBe(0)
  })

  it('computes correct average for two evenly-spaced feeds', () => {
    // two feeds, 3 hours apart, both within 24 h
    const logs = [{ startedAt: at(6 * HR) }, { startedAt: at(3 * HR) }]
    expect(calcAvgIntervalMin(logs, NOW, 24 * HR)).toBe(180)
  })

  it('averages across multiple intervals', () => {
    // 3 feeds: 2 h apart then 4 h apart → avg 3 h = 180 min
    const logs = [{ startedAt: at(6 * HR) }, { startedAt: at(4 * HR) }, { startedAt: at(0) }]
    expect(calcAvgIntervalMin(logs, NOW, 24 * HR)).toBe(180)
  })

  it('filters out logs older than the cutoff before averaging', () => {
    // only the two within 24 h matter (2 h interval)
    const logs = [
      { startedAt: at(48 * HR) },
      { startedAt: at(4 * HR) },
      { startedAt: at(2 * HR) },
    ]
    expect(calcAvgIntervalMin(logs, NOW, 24 * HR)).toBe(120)
  })
})

// ---------------------------------------------------------------------------
// calcSleepStats
// ---------------------------------------------------------------------------

describe('calcSleepStats', () => {
  it('returns zeros when no completed sleeps', () => {
    expect(calcSleepStats([])).toEqual({ longestStretchMin: 0, avgDailySleepMin: 0, avgWakeWindowMin: 0 })
  })

  it('ignores in-progress sleeps (endedAt null)', () => {
    const sleeps = [{ startedAt: at(2 * HR), endedAt: null }]
    expect(calcSleepStats(sleeps)).toEqual({ longestStretchMin: 0, avgDailySleepMin: 0, avgWakeWindowMin: 0 })
  })

  it('computes longestStretchMin correctly', () => {
    const sleeps = [
      { startedAt: at(10 * HR), endedAt: at(8 * HR) },   // 2 h = 120 min
      { startedAt: at(6 * HR), endedAt: at(2 * HR) },    // 4 h = 240 min
    ]
    const { longestStretchMin } = calcSleepStats(sleeps)
    expect(longestStretchMin).toBe(240)
  })

  it('computes avgDailySleepMin over a 7-day window', () => {
    // single 7-hour sleep → 60 min/day average
    const sleeps = [{ startedAt: at(7 * HR), endedAt: at(0) }]
    const { avgDailySleepMin } = calcSleepStats(sleeps)
    expect(avgDailySleepMin).toBe(60)
  })

  it('computes avgWakeWindowMin between sleeps', () => {
    // sleep 1: ends 5 h ago; sleep 2: starts 3 h ago → 2 h wake window = 120 min
    const sleeps = [
      { startedAt: at(8 * HR), endedAt: at(5 * HR) },
      { startedAt: at(3 * HR), endedAt: at(1 * HR) },
    ]
    const { avgWakeWindowMin } = calcSleepStats(sleeps)
    expect(avgWakeWindowMin).toBe(120)
  })

  it('excludes wake windows ≥ 6 hours (likely an overnight gap, not a wake window)', () => {
    // gap of 7 h between sleeps — should be excluded
    const sleeps = [
      { startedAt: at(20 * HR), endedAt: at(13 * HR) },
      { startedAt: at(6 * HR), endedAt: at(4 * HR) },
    ]
    const { avgWakeWindowMin } = calcSleepStats(sleeps)
    expect(avgWakeWindowMin).toBe(0)
  })
})
