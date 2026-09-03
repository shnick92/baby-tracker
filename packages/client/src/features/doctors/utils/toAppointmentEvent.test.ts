import { describe, it, expect } from 'vitest'
import { toAppointmentEvent } from './toAppointmentEvent'
import { formatDoctorLocation } from './formatDoctorLocation'

const appt = {
  id: 'a1',
  doctorId: 'd1',
  title: null,
  date: '2026-06-01',
  startTime: null,
  endTime: null,
  notes: null,
  doctor: { id: 'd1', name: 'Dr. Rivera', practiceName: 'Springfield Pediatrics', address: '12 Main St' },
}

describe('toAppointmentEvent', () => {
  it('uses the doctor name as the summary when there is no title', () => {
    expect(toAppointmentEvent(appt).summary).toBe('Dr. Rivera appointment')
  })

  it('prefixes the title with the doctor name', () => {
    expect(toAppointmentEvent({ ...appt, title: '20-week scan' }).summary).toBe('Dr. Rivera — 20-week scan')
  })

  it('carries practice and address into the location', () => {
    expect(toAppointmentEvent(appt).location).toBe('Springfield Pediatrics · 12 Main St')
  })
})

describe('formatDoctorLocation', () => {
  it('returns null when no location parts are set', () => {
    expect(formatDoctorLocation({ practiceName: null, address: '  ' })).toBeNull()
  })

  it('returns a single part on its own', () => {
    expect(formatDoctorLocation({ practiceName: null, address: '12 Main St' })).toBe('12 Main St')
  })
})
