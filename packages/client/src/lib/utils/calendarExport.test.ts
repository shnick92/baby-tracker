import { describe, it, expect } from 'vitest'
import { generateIcal, buildGoogleCalendarUrl } from './calendarExport'

const baseEvent = {
  id: 'appt1',
  summary: 'Dr. Rivera — 20-week scan',
  date: '2026-06-01',
  startTime: null,
  endTime: null,
}

describe('generateIcal', () => {
  it('generates an all-day event when no start time', () => {
    const ical = generateIcal(baseEvent)
    expect(ical).toContain('DTSTART;VALUE=DATE:20260601')
    expect(ical).toContain('DTEND;VALUE=DATE:20260602')
    expect(ical).toContain('UID:appt1@babytracker')
  })

  it('generates a timed event with start and end', () => {
    const ical = generateIcal({ ...baseEvent, startTime: '2026-06-01T14:00:00.000Z', endTime: '2026-06-01T15:00:00.000Z' })
    expect(ical).toContain('DTSTART:20260601T140000Z')
    expect(ical).toContain('DTEND:20260601T150000Z')
  })

  it('includes a LOCATION line when a location is given', () => {
    const ical = generateIcal({ ...baseEvent, location: '12 Main St, Springfield' })
    expect(ical).toContain('LOCATION:12 Main St\\, Springfield')
  })

  it('omits LOCATION and DESCRIPTION when absent', () => {
    const ical = generateIcal(baseEvent)
    expect(ical).not.toContain('LOCATION')
    expect(ical).not.toContain('DESCRIPTION')
  })

  it('escapes newlines and separators in the description', () => {
    const ical = generateIcal({ ...baseEvent, description: 'Bring: card; forms\nArrive early' })
    expect(ical).toContain('DESCRIPTION:Bring: card\\; forms\\nArrive early')
  })
})

describe('buildGoogleCalendarUrl', () => {
  it('encodes summary, dates and location', () => {
    const url = buildGoogleCalendarUrl({ ...baseEvent, location: 'Springfield Clinic' })
    expect(url).toContain('calendar.google.com')
    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('text=Dr.%20Rivera')
    expect(url).toContain('dates=20260601/20260602')
    expect(url).toContain('location=Springfield%20Clinic')
  })

  it('uses timed dates when a start time is present', () => {
    const url = buildGoogleCalendarUrl({ ...baseEvent, startTime: '2026-06-01T14:00:00.000Z', endTime: null })
    expect(url).toContain('20260601T140000Z/20260601T140000Z')
  })
})
