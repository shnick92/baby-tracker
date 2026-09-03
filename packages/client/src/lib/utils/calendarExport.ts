// Builds iCal (.ics) files and Google Calendar links for any dated event in the
// app — visitor slots, doctor appointments, etc. All-day events use the local
// YYYY-MM-DD `date`; timed events use the ISO `startTime` / `endTime` instants.

export type CalendarEvent = {
  id: string
  summary: string
  date: string
  startTime: string | null
  endTime: string | null
  description?: string | null
  location?: string | null
}

function toIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

function toIcalDateTime(isoStr: string): string {
  // "2026-10-15T14:00:00.000Z" → "20261015T140000Z"
  return isoStr.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').slice(0, 15) + 'Z'
}

function nextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`
}

// Escapes text for an iCal property value (RFC 5545 §3.3.11).
function escapeIcalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateIcal(event: CalendarEvent): string {
  let dtstart: string
  let dtend: string

  if (event.startTime) {
    dtstart = `DTSTART:${toIcalDateTime(event.startTime)}`
    dtend = `DTEND:${toIcalDateTime(event.endTime ?? event.startTime)}`
  } else {
    dtstart = `DTSTART;VALUE=DATE:${toIcalDate(event.date)}`
    dtend = `DTEND;VALUE=DATE:${nextDayStr(event.date)}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baby Tracker//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@babytracker`,
    dtstart,
    dtend,
    `SUMMARY:${escapeIcalText(event.summary)}`,
    event.location ? `LOCATION:${escapeIcalText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeIcalText(event.description)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const text = encodeURIComponent(event.summary)
  let dates: string

  if (event.startTime) {
    const start = toIcalDateTime(event.startTime)
    const end = toIcalDateTime(event.endTime ?? event.startTime)
    dates = `${start}/${end}`
  } else {
    dates = `${toIcalDate(event.date)}/${nextDayStr(event.date)}`
  }

  const details = event.description ? `&details=${encodeURIComponent(event.description)}` : ''
  const location = event.location ? `&location=${encodeURIComponent(event.location)}` : ''
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}${details}${location}`
}

export function downloadIcal(ical: string, filename: string): void {
  const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
