import { describe, it, expect } from 'vitest'

import { countDiapers, formatDayLabel, groupDiapersByDay, startOfLocalDay } from './groupDiapersByDay'

const now = new Date(2026, 9, 25, 14, 0) // Sun Oct 25 2026, 2 PM local
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString()

describe('startOfLocalDay', () => {
  it('returns local midnight of today and earlier days', () => {
    expect(startOfLocalDay(0, now)).toEqual(new Date(2026, 9, 25))
    expect(startOfLocalDay(6, now)).toEqual(new Date(2026, 9, 19))
  })
})

describe('formatDayLabel', () => {
  it('labels today, yesterday, and older days', () => {
    expect(formatDayLabel(new Date(2026, 9, 25), now)).toBe('Today')
    expect(formatDayLabel(new Date(2026, 9, 24), now)).toBe('Yesterday')
    expect(formatDayLabel(new Date(2026, 9, 23), now)).toBe('Fri, Oct 23')
  })
})

describe('groupDiapersByDay', () => {
  it('splits logs across local days, newest first', () => {
    const logs = [
      { id: 'a', occurredAt: at(25, 9) },
      { id: 'b', occurredAt: at(25, 1) },
      { id: 'c', occurredAt: at(24, 23) },
      { id: 'd', occurredAt: at(23, 8) },
    ]
    const groups = groupDiapersByDay(logs, now)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Fri, Oct 23'])
    expect(groups.map((g) => g.logs.map((l) => l.id))).toEqual([['a', 'b'], ['c'], ['d']])
  })
})

describe('countDiapers', () => {
  it('counts a wet + dirty change once in the total', () => {
    const counts = countDiapers([{ type: 'WET' }, { type: 'BOTH' }, { type: 'DIRTY' }])
    expect(counts).toEqual({ total: 3, wet: 2, dirty: 2 })
  })
})
