import { describe, it, expect } from 'vitest'
import { startContractionSchema, endContractionSchema } from '@tracker/shared'

describe('startContractionSchema', () => {
  it('accepts a valid babyId', () => {
    const result = startContractionSchema.safeParse({ babyId: 'baby1' })
    expect(result.success).toBe(true)
  })

  it('rejects a missing babyId', () => {
    const result = startContractionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts an optional startedAt timestamp', () => {
    const result = startContractionSchema.safeParse({
      babyId: 'baby1',
      startedAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-datetime startedAt', () => {
    const result = startContractionSchema.safeParse({ babyId: 'baby1', startedAt: 'not-a-date' })
    expect(result.success).toBe(false)
  })
})

describe('endContractionSchema', () => {
  it('accepts an empty body', () => {
    const result = endContractionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts an optional endedAt timestamp', () => {
    const result = endContractionSchema.safeParse({ endedAt: new Date().toISOString() })
    expect(result.success).toBe(true)
  })

  it('rejects a non-datetime endedAt', () => {
    const result = endContractionSchema.safeParse({ endedAt: 'not-a-date' })
    expect(result.success).toBe(false)
  })
})
