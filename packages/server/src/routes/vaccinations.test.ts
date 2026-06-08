import { describe, it, expect } from 'vitest'
import { logVaccinationSchema, updateVaccinationSchema, VACCINE_SCHEDULE, getVaccineByKey } from '@tracker/shared'

describe('logVaccinationSchema', () => {
  const validPayload = {
    babyId: 'baby1',
    vaccineKey: 'hepb-1',
    administeredAt: new Date().toISOString(),
  }

  it('accepts a valid payload', () => {
    const result = logVaccinationSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('requires vaccineKey', () => {
    const result = logVaccinationSchema.safeParse({ ...validPayload, vaccineKey: '' })
    expect(result.success).toBe(false)
  })

  it('requires administeredAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { administeredAt: _at, ...rest } = validPayload
    const result = logVaccinationSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts optional lotNumber and provider', () => {
    const result = logVaccinationSchema.safeParse({
      ...validPayload,
      lotNumber: 'AB123',
      provider: 'Dr. Smith',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateVaccinationSchema', () => {
  it('accepts an empty body', () => {
    expect(updateVaccinationSchema.safeParse({}).success).toBe(true)
  })

  it('accepts nullable lotNumber', () => {
    expect(updateVaccinationSchema.safeParse({ lotNumber: null }).success).toBe(true)
  })
})

describe('VACCINE_SCHEDULE', () => {
  it('has at least 20 entries', () => {
    expect(VACCINE_SCHEDULE.length).toBeGreaterThanOrEqual(20)
  })

  it('every entry has a unique key', () => {
    const keys = VACCINE_SCHEDULE.map((v) => v.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('includes HepB dose 1 at birth', () => {
    const hepb1 = VACCINE_SCHEDULE.find((v) => v.key === 'hepb-1')
    expect(hepb1).toBeDefined()
    expect(hepb1!.ageWindowMonths[0]).toBe(0)
  })

  it('includes DTaP doses 1–4', () => {
    for (let i = 1; i <= 4; i++) {
      expect(VACCINE_SCHEDULE.find((v) => v.key === `dtap-${i}`)).toBeDefined()
    }
  })
})

describe('getVaccineByKey', () => {
  it('returns the vaccine entry for a known key', () => {
    const entry = getVaccineByKey('hepb-1')
    expect(entry).toBeDefined()
    expect(entry!.doseNumber).toBe(1)
  })

  it('returns undefined for an unknown key', () => {
    expect(getVaccineByKey('not-a-real-vaccine')).toBeUndefined()
  })
})
