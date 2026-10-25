import { describe, it, expect, vi } from 'vitest'

import { diaperHistoryStart } from './useDiaperLogs'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@features/illness', () => ({ useActiveEpisode: () => ({ data: null }) }))

const now = new Date(2026, 9, 25, 14, 0) // Sun Oct 25 2026, 2 PM local

describe('diaperHistoryStart', () => {
  it('covers today plus the six prior days without a sick episode', () => {
    expect(diaperHistoryStart(null, now)).toEqual(new Date(2026, 9, 19))
  })

  it('keeps the 7-day window for an episode that started within it', () => {
    expect(diaperHistoryStart(new Date(2026, 9, 22, 9).toISOString(), now)).toEqual(new Date(2026, 9, 19))
  })

  it('extends back to the day an older episode started', () => {
    expect(diaperHistoryStart(new Date(2026, 9, 12, 21).toISOString(), now)).toEqual(new Date(2026, 9, 12))
  })
})
