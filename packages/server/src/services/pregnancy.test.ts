import { describe, it, expect } from 'vitest'
import { calculatePregnancyStatus } from './pregnancy'

// Pin a fixed reference time so tests don't drift
const NOW = new Date('2026-01-20T12:00:00.000Z')

// Build a dueDate that puts us at exactly `targetWeek` weeks pregnant at NOW.
// dueDate = NOW + (40 - targetWeek) weeks
function dueDateAtWeek(targetWeek: number): Date {
  return new Date(NOW.getTime() + (40 - targetWeek) * 7 * 24 * 60 * 60 * 1000)
}

describe('calculatePregnancyStatus', () => {
  it('returns correct counts at 20 weeks pregnant', () => {
    const result = calculatePregnancyStatus(dueDateAtWeek(20), null, NOW)
    expect(result.weeksPregnant).toBe(20)
    expect(result.weeksRemaining).toBe(20)
    expect(result.progressPct).toBe(50)
    expect(result.born).toBe(false)
  })

  it('clamps to week 0 when before conception', () => {
    // dueDate 42 weeks from now → LMP is 2 weeks in the future → weeksPregnant would be negative
    const dueDate = new Date(NOW.getTime() + 42 * 7 * 24 * 60 * 60 * 1000)
    const result = calculatePregnancyStatus(dueDate, null, NOW)
    expect(result.weeksPregnant).toBe(0)
    expect(result.progressPct).toBe(0)
    expect(result.weeksRemaining).toBe(40)
  })

  it('clamps to week 40 when past due date', () => {
    // dueDate 1 week in the past → 41 raw weeks → clamped to 40
    const dueDate = new Date(NOW.getTime() - 1 * 7 * 24 * 60 * 60 * 1000)
    const result = calculatePregnancyStatus(dueDate, null, NOW)
    expect(result.weeksPregnant).toBe(40)
    expect(result.weeksRemaining).toBe(0)
    expect(result.progressPct).toBe(100)
  })

  it('returns born: true when birthDate is set', () => {
    const result = calculatePregnancyStatus(dueDateAtWeek(38), new Date(), NOW)
    expect(result.born).toBe(true)
  })

  it('returns born: false when birthDate is null', () => {
    const result = calculatePregnancyStatus(dueDateAtWeek(30), null, NOW)
    expect(result.born).toBe(false)
  })

  it('returns the correct baby size at week 20 (banana)', () => {
    const result = calculatePregnancyStatus(dueDateAtWeek(20), null, NOW)
    expect(result.babySize).toBe('🍌 banana')
  })

  it('returns poppy seed for weeks below 4 (clamped to 4)', () => {
    const result = calculatePregnancyStatus(dueDateAtWeek(2), null, NOW)
    expect(result.babySize).toBe('🌱 poppy seed')
  })

  it('returns the dueDate as an ISO string', () => {
    const dueDate = new Date('2026-10-01T00:00:00.000Z')
    const result = calculatePregnancyStatus(dueDate, null, NOW)
    expect(result.dueDate).toBe('2026-10-01T00:00:00.000Z')
  })
})
