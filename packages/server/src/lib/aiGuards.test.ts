import { describe, it, expect, afterEach } from 'vitest'
import { isAIEnabled, isSeedGuarded, estimateCost } from './aiGuards'

describe('isAIEnabled', () => {
  const origKey = process.env['ANTHROPIC_API_KEY']
  const origEnabled = process.env['AI_ENABLED']

  afterEach(() => {
    if (origKey === undefined) {
      delete process.env['ANTHROPIC_API_KEY']
    } else {
      process.env['ANTHROPIC_API_KEY'] = origKey
    }
    if (origEnabled === undefined) {
      delete process.env['AI_ENABLED']
    } else {
      process.env['AI_ENABLED'] = origEnabled
    }
  })

  it('returns false when ANTHROPIC_API_KEY is absent', () => {
    delete process.env['ANTHROPIC_API_KEY']
    delete process.env['AI_ENABLED']
    expect(isAIEnabled()).toBe(false)
  })

  it('returns true when ANTHROPIC_API_KEY is set and AI_ENABLED is not set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test'
    delete process.env['AI_ENABLED']
    expect(isAIEnabled()).toBe(true)
  })

  it('returns false when AI_ENABLED is "false" even if key is set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test'
    process.env['AI_ENABLED'] = 'false'
    expect(isAIEnabled()).toBe(false)
  })

  it('returns true when AI_ENABLED is "true" and key is set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test'
    process.env['AI_ENABLED'] = 'true'
    expect(isAIEnabled()).toBe(true)
  })
})

describe('isSeedGuarded', () => {
  const origGuard = process.env['SEED_DATA_GUARD']

  afterEach(() => {
    if (origGuard === undefined) {
      delete process.env['SEED_DATA_GUARD']
    } else {
      process.env['SEED_DATA_GUARD'] = origGuard
    }
  })

  it('returns false when SEED_DATA_GUARD is absent', () => {
    delete process.env['SEED_DATA_GUARD']
    expect(isSeedGuarded()).toBe(false)
  })

  it('returns false when SEED_DATA_GUARD is "false"', () => {
    process.env['SEED_DATA_GUARD'] = 'false'
    expect(isSeedGuarded()).toBe(false)
  })

  it('returns true when SEED_DATA_GUARD is "true"', () => {
    process.env['SEED_DATA_GUARD'] = 'true'
    expect(isSeedGuarded()).toBe(true)
  })
})

describe('estimateCost', () => {
  it('returns 0 for unknown models', () => {
    expect(estimateCost('claude-unknown-1', 1000, 500)).toBe(0)
  })

  it('estimates Haiku cost correctly', () => {
    // 1M input tokens = $0.80, 1M output = $4.00
    // 1000 input + 500 output → (0.0008) + (0.002) = 0.0028
    const cost = estimateCost('claude-haiku-4-5-20251001', 1000, 500)
    expect(cost).toBeCloseTo(0.0028, 6)
  })

  it('estimates Sonnet cost correctly', () => {
    // 1M input = $3.00, 1M output = $15.00
    // 1000 input + 300 output → 0.003 + 0.0045 = 0.0075
    const cost = estimateCost('claude-sonnet-4-6', 1000, 300)
    expect(cost).toBeCloseTo(0.0075, 6)
  })

  it('returns 0 when both token counts are 0', () => {
    expect(estimateCost('claude-haiku-4-5-20251001', 0, 0)).toBe(0)
  })
})
