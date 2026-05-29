import { describe, it, expect } from 'vitest'
import { createEpisodeSchema, addSymptomSchema, logTemperatureSchema } from '@tracker/shared'

// ── createEpisodeSchema ────────────────────────────────────────────────────

describe('createEpisodeSchema', () => {
  it('accepts a minimal payload with just babyId', () => {
    const result = createEpisodeSchema.safeParse({ babyId: 'baby-1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symptoms).toEqual([])
    }
  })

  it('accepts string[] symptoms', () => {
    const result = createEpisodeSchema.safeParse({
      babyId: 'baby-1',
      symptoms: ['fever', 'runny nose'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symptoms).toEqual(['fever', 'runny nose'])
    }
  })

  it('rejects object-array symptoms — the shape the client bug was sending', () => {
    // This is the exact payload the NLP illness_start handler was mistakenly sending.
    // symptoms must be string[], not { label: string }[].
    const result = createEpisodeSchema.safeParse({
      babyId: 'baby-1',
      symptoms: [{ label: 'fever' }, { label: 'runny nose' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing babyId', () => {
    const result = createEpisodeSchema.safeParse({ symptoms: ['fever'] })
    expect(result.success).toBe(false)
  })

  it('rejects more than 20 symptoms', () => {
    const result = createEpisodeSchema.safeParse({
      babyId: 'baby-1',
      symptoms: Array.from({ length: 21 }, (_, i) => `symptom-${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('accepts an optional ISO startedAt', () => {
    const result = createEpisodeSchema.safeParse({
      babyId: 'baby-1',
      startedAt: '2026-05-28T20:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-ISO startedAt', () => {
    const result = createEpisodeSchema.safeParse({
      babyId: 'baby-1',
      startedAt: 'yesterday',
    })
    expect(result.success).toBe(false)
  })
})

// ── addSymptomSchema ───────────────────────────────────────────────────────

describe('addSymptomSchema', () => {
  it('accepts a valid label', () => {
    expect(addSymptomSchema.safeParse({ label: 'Fever' }).success).toBe(true)
  })

  it('rejects an empty label', () => {
    expect(addSymptomSchema.safeParse({ label: '' }).success).toBe(false)
  })

  it('rejects a label over 100 chars', () => {
    expect(addSymptomSchema.safeParse({ label: 'x'.repeat(101) }).success).toBe(false)
  })
})

// ── logTemperatureSchema ───────────────────────────────────────────────────

describe('logTemperatureSchema', () => {
  it('accepts a valid tempF reading', () => {
    const result = logTemperatureSchema.safeParse({ tempF: 101.2, method: 'EAR' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid tempC reading', () => {
    const result = logTemperatureSchema.safeParse({ tempC: 38.5, method: 'FOREHEAD' })
    expect(result.success).toBe(true)
  })

  it('rejects when neither tempF nor tempC is provided', () => {
    const result = logTemperatureSchema.safeParse({ method: 'ORAL' })
    expect(result.success).toBe(false)
  })

  it('rejects an out-of-range tempF', () => {
    expect(logTemperatureSchema.safeParse({ tempF: 89, method: 'EAR' }).success).toBe(false)
    expect(logTemperatureSchema.safeParse({ tempF: 116, method: 'EAR' }).success).toBe(false)
  })

  it('rejects an invalid method', () => {
    const result = logTemperatureSchema.safeParse({ tempF: 99, method: 'ARMPIT' })
    expect(result.success).toBe(false)
  })
})

// ── standalone temperature route schema (NLP quick-log) ───────────────────
// The /api/illness/temperature endpoint accepts babyId + optional method
// (defaults to FOREHEAD). Build the equivalent schema inline to test the shape.

import { z } from 'zod'

const TEMP_METHODS = ['FOREHEAD', 'EAR', 'RECTAL', 'AXILLARY', 'ORAL'] as const

const nlpTemperatureSchema = z.object({
  babyId: z.string().min(1),
  tempF: z.number().min(90).max(115).optional(),
  tempC: z.number().min(32).max(46).optional(),
  method: z.enum(TEMP_METHODS).default('FOREHEAD'),
  recordedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
}).refine((d) => d.tempF !== undefined || d.tempC !== undefined, {
  message: 'Temperature value is required',
})

describe('NLP temperature payload shape', () => {
  it('accepts tempF without a method (defaults to FOREHEAD)', () => {
    const result = nlpTemperatureSchema.safeParse({ babyId: 'b-1', tempF: 101.5 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.method).toBe('FOREHEAD')
  })

  it('accepts an explicit method when provided', () => {
    const result = nlpTemperatureSchema.safeParse({ babyId: 'b-1', tempF: 99.8, method: 'EAR' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.method).toBe('EAR')
  })

  it('accepts tempC without tempF', () => {
    const result = nlpTemperatureSchema.safeParse({ babyId: 'b-1', tempC: 38.5 })
    expect(result.success).toBe(true)
  })

  it('rejects when neither tempF nor tempC is provided', () => {
    const result = nlpTemperatureSchema.safeParse({ babyId: 'b-1', method: 'FOREHEAD' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid method value', () => {
    const result = nlpTemperatureSchema.safeParse({ babyId: 'b-1', tempF: 101, method: 'ARMPIT' })
    expect(result.success).toBe(false)
  })
})
