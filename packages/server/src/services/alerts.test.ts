import { describe, it, expect } from 'vitest'
import { calcCooldownRemainingSec, isOnCooldown, COOLDOWN_MS } from './alerts'

const NOW = 1_700_000_000_000

function sentAt(msAgo: number): Date {
  return new Date(NOW - msAgo)
}

describe('calcCooldownRemainingSec', () => {
  it('returns 60 when alert was just sent', () => {
    expect(calcCooldownRemainingSec(sentAt(0), NOW)).toBe(60)
  })

  it('returns 0 when cooldown has expired', () => {
    expect(calcCooldownRemainingSec(sentAt(COOLDOWN_MS), NOW)).toBe(0)
  })

  it('returns 0 when well past cooldown', () => {
    expect(calcCooldownRemainingSec(sentAt(COOLDOWN_MS + 5_000), NOW)).toBe(0)
  })

  it('returns correct ceiling value mid-cooldown', () => {
    // sent 30.5 s ago → 29.5 s remaining → ceil → 30
    expect(calcCooldownRemainingSec(sentAt(30_500), NOW)).toBe(30)
  })

  it('rounds up fractional seconds', () => {
    // sent 59.1 s ago → 0.9 s remaining → ceil → 1
    expect(calcCooldownRemainingSec(sentAt(59_100), NOW)).toBe(1)
  })
})

describe('isOnCooldown', () => {
  it('returns true when sent 1 ms ago', () => {
    expect(isOnCooldown(sentAt(1), NOW)).toBe(true)
  })

  it('returns true when sent 59 s ago', () => {
    expect(isOnCooldown(sentAt(59_000), NOW)).toBe(true)
  })

  it('returns false when sent exactly 60 s ago', () => {
    expect(isOnCooldown(sentAt(COOLDOWN_MS), NOW)).toBe(false)
  })

  it('returns false when sent 90 s ago', () => {
    expect(isOnCooldown(sentAt(90_000), NOW)).toBe(false)
  })
})
