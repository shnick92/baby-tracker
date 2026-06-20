type SlotForCal = {
  id: string
  name: string
  date: string
  startTime: string | null
  endTime: string | null
  notes?: string | null
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

export function generateVisitorIcal(slot: SlotForCal): string {
  const summary = `${slot.name} visit`

  let dtstart: string
  let dtend: string

  if (slot.startTime) {
    dtstart = `DTSTART:${toIcalDateTime(slot.startTime)}`
    dtend = `DTEND:${toIcalDateTime(slot.endTime ?? slot.startTime)}`
  } else {
    dtstart = `DTSTART;VALUE=DATE:${toIcalDate(slot.date)}`
    dtend = `DTEND;VALUE=DATE:${nextDayStr(slot.date)}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baby Tracker//EN',
    'BEGIN:VEVENT',
    `UID:${slot.id}@babytracker`,
    dtstart,
    dtend,
    `SUMMARY:${summary}`,
    slot.notes ? `DESCRIPTION:${slot.notes.replace(/\n/g, '\\n')}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

export function buildGoogleCalendarUrl(slot: SlotForCal): string {
  const text = encodeURIComponent(`${slot.name} visit`)
  let dates: string

  if (slot.startTime) {
    const start = toIcalDateTime(slot.startTime)
    const end = toIcalDateTime(slot.endTime ?? slot.startTime)
    dates = `${start}/${end}`
  } else {
    dates = `${toIcalDate(slot.date)}/${nextDayStr(slot.date)}`
  }

  const details = slot.notes ? `&details=${encodeURIComponent(slot.notes)}` : ''
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}${details}`
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
