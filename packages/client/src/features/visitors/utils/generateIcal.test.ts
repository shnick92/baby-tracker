import { describe, it, expect } from 'vitest'
import { generateVisitorIcal, buildGoogleCalendarUrl } from './generateIcal'

const baseSlot = {
  id: 'abc123',
  name: 'Grandma Betty',
  date: '2026-10-15',
  startTime: null,
  endTime: null,
  notes: null,
}

describe('generateVisitorIcal', () => {
  it('generates an all-day event when no start time', () => {
    const ical = generateVisitorIcal(baseSlot)
    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('SUMMARY:Grandma Betty visit')
    expect(ical).toContain('DTSTART;VALUE=DATE:20261015')
    expect(ical).toContain('DTEND;VALUE=DATE:20261016')
    expect(ical).toContain('UID:abc123@babytracker')
    expect(ical).toContain('END:VEVENT')
  })

  it('generates a timed event with start and end', () => {
    const ical = generateVisitorIcal({
      ...baseSlot,
      startTime: '2026-10-15T14:00:00.000Z',
      endTime: '2026-10-15T16:00:00.000Z',
    })
    expect(ical).toContain('DTSTART:20261015T140000Z')
    expect(ical).toContain('DTEND:20261015T160000Z')
  })

  it('uses start time as end time when end is missing', () => {
    const ical = generateVisitorIcal({
      ...baseSlot,
      startTime: '2026-10-15T14:00:00.000Z',
      endTime: null,
    })
    expect(ical).toContain('DTSTART:20261015T140000Z')
    expect(ical).toContain('DTEND:20261015T140000Z')
  })

  it('includes description when notes present', () => {
    const ical = generateVisitorIcal({ ...baseSlot, notes: 'Bring flowers' })
    expect(ical).toContain('DESCRIPTION:Bring flowers')
  })

  it('omits description line when notes absent', () => {
    const ical = generateVisitorIcal(baseSlot)
    expect(ical).not.toContain('DESCRIPTION')
  })
})

describe('buildGoogleCalendarUrl', () => {
  it('returns a google calendar url for an all-day event', () => {
    const url = buildGoogleCalendarUrl(baseSlot)
    expect(url).toContain('calendar.google.com')
    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('Grandma%20Betty%20visit')
    expect(url).toContain('20261015/20261016')
  })

  it('returns a timed google calendar url', () => {
    const url = buildGoogleCalendarUrl({
      ...baseSlot,
      startTime: '2026-10-15T14:00:00.000Z',
      endTime: '2026-10-15T16:00:00.000Z',
    })
    expect(url).toContain('20261015T140000Z/20261015T160000Z')
  })
})
