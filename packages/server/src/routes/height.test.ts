import { describe, it, expect } from 'vitest'
import { logHeightSchema, updateHeightSchema } from '@tracker/shared'

describe('logHeightSchema', () => {
  it('accepts a valid height in inches', () => {
    const result = logHeightSchema.safeParse({ babyId: 'baby1', inches: 21.5 })
    expect(result.success).toBe(true)
  })

  it('rejects inches below minimum (10)', () => {
    const result = logHeightSchema.safeParse({ babyId: 'baby1', inches: 5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/min 10/i)
  })

  it('rejects inches above maximum (48)', () => {
    const result = logHeightSchema.safeParse({ babyId: 'baby1', inches: 60 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/max 48/i)
  })

  it('accepts an optional recordedAt timestamp', () => {
    const result = logHeightSchema.safeParse({
      babyId: 'baby1',
      inches: 19.5,
      recordedAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('requires babyId', () => {
    const result = logHeightSchema.safeParse({ inches: 21.5 })
    expect(result.success).toBe(false)
  })
})

describe('updateHeightSchema', () => {
  it('accepts a partial update with only inches', () => {
    const result = updateHeightSchema.safeParse({ inches: 22.0 })
    expect(result.success).toBe(true)
  })

  it('accepts an empty body (no-op patch)', () => {
    const result = updateHeightSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects an out-of-range inches value', () => {
    const result = updateHeightSchema.safeParse({ inches: 100 })
    expect(result.success).toBe(false)
  })

  it('accepts nullable notes', () => {
    const result = updateHeightSchema.safeParse({ notes: null })
    expect(result.success).toBe(true)
  })
})
