import { describe, it, expect } from 'vitest'
import { CDC_MILESTONES, MILESTONE_CATEGORY_LABELS } from '@tracker/shared'

describe('CDC_MILESTONES', () => {
  it('contains milestones for months 1, 2, 4, and 6', () => {
    const months = new Set(CDC_MILESTONES.map((m) => m.ageMonths))
    expect(months.has(1)).toBe(true)
    expect(months.has(2)).toBe(true)
    expect(months.has(4)).toBe(true)
    expect(months.has(6)).toBe(true)
  })

  it('has at least 30 milestones', () => {
    expect(CDC_MILESTONES.length).toBeGreaterThanOrEqual(30)
  })

  it('every milestone has a valid category', () => {
    const validCategories = new Set(Object.keys(MILESTONE_CATEGORY_LABELS))
    for (const m of CDC_MILESTONES) {
      expect(validCategories.has(m.category)).toBe(true)
    }
  })

  it('every milestone has a non-empty label', () => {
    for (const m of CDC_MILESTONES) {
      expect(m.label.length).toBeGreaterThan(0)
    }
  })

  it('includes at least one SOCIAL milestone', () => {
    expect(CDC_MILESTONES.some((m) => m.category === 'SOCIAL')).toBe(true)
  })

  it('includes at least one MOTOR_GROSS milestone', () => {
    expect(CDC_MILESTONES.some((m) => m.category === 'MOTOR_GROSS')).toBe(true)
  })

  it('includes at least one LANGUAGE milestone', () => {
    expect(CDC_MILESTONES.some((m) => m.category === 'LANGUAGE')).toBe(true)
  })
})

describe('MILESTONE_CATEGORY_LABELS', () => {
  it('has a label for every MilestoneCategory value', () => {
    const expected = ['MOTOR_GROSS', 'MOTOR_FINE', 'SOCIAL', 'LANGUAGE', 'COGNITIVE', 'FEEDING', 'CUSTOM']
    for (const key of expected) {
      expect(MILESTONE_CATEGORY_LABELS).toHaveProperty(key)
    }
  })
})
