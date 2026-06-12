import { describe, it, expect } from 'vitest'
import { exportQuerySchema, healthSummaryQuerySchema } from '@tracker/shared'

describe('exportQuerySchema', () => {
  const valid = {
    babyId: 'b1',
    types: 'feeding,sleep',
    from: '2026-06-01',
    to: '2026-06-07',
    format: 'pdf',
  }

  it('accepts a valid query and splits types', () => {
    const result = exportQuerySchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.types).toEqual(['feeding', 'sleep'])
    }
  })

  it('rejects unknown data types', () => {
    expect(exportQuerySchema.safeParse({ ...valid, types: 'feeding,unicorns' }).success).toBe(false)
  })

  it('rejects an empty types string', () => {
    expect(exportQuerySchema.safeParse({ ...valid, types: '' }).success).toBe(false)
  })

  it('rejects from > to', () => {
    expect(exportQuerySchema.safeParse({ ...valid, from: '2026-06-08' }).success).toBe(false)
  })

  it('rejects non-ISO dates', () => {
    expect(exportQuerySchema.safeParse({ ...valid, from: '06/01/2026' }).success).toBe(false)
  })

  it('rejects formats other than pdf or csv', () => {
    expect(exportQuerySchema.safeParse({ ...valid, format: 'xlsx' }).success).toBe(false)
  })
})

describe('healthSummaryQuerySchema', () => {
  it('accepts valid sections and splits them', () => {
    const result = healthSummaryQuerySchema.safeParse({ babyId: 'b1', sections: 'vaccinations,growth' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sections).toEqual(['vaccinations', 'growth'])
    }
  })

  it('rejects unknown sections', () => {
    expect(healthSummaryQuerySchema.safeParse({ babyId: 'b1', sections: 'horoscope' }).success).toBe(false)
  })

  it('rejects missing babyId', () => {
    expect(healthSummaryQuerySchema.safeParse({ sections: 'growth' }).success).toBe(false)
  })
})
