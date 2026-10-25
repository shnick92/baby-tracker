import { describe, it, expect } from 'vitest'
import { diaperListQuerySchema } from '@tracker/shared'

describe('diaperListQuerySchema', () => {
  it('accepts just a babyId', () => {
    const result = diaperListQuerySchema.safeParse({ babyId: 'baby1' })
    expect(result.success).toBe(true)
  })

  it('rejects a missing babyId', () => {
    const result = diaperListQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts a since timestamp with an offset', () => {
    const result = diaperListQuerySchema.safeParse({ babyId: 'baby1', since: '2026-10-19T00:00:00.000-05:00' })
    expect(result.success).toBe(true)
  })

  it('rejects a non-datetime since', () => {
    const result = diaperListQuerySchema.safeParse({ babyId: 'baby1', since: 'yesterday' })
    expect(result.success).toBe(false)
  })

  it('coerces a query-string limit to a number', () => {
    const result = diaperListQuerySchema.safeParse({ babyId: 'baby1', limit: '50' })
    expect(result.success && result.data.limit).toBe(50)
  })

  it('rejects a limit above 500', () => {
    const result = diaperListQuerySchema.safeParse({ babyId: 'baby1', limit: '501' })
    expect(result.success).toBe(false)
  })
})
