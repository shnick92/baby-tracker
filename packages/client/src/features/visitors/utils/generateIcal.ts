import { generateIcal, buildGoogleCalendarUrl as buildEventUrl, type CalendarEvent } from '@lib/utils/calendarExport'

type SlotForCal = {
  id: string
  name: string
  date: string
  startTime: string | null
  endTime: string | null
  notes?: string | null
}

export function toVisitorEvent(slot: SlotForCal): CalendarEvent {
  return {
    id: slot.id,
    summary: `${slot.name} visit`,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    description: slot.notes ?? null,
  }
}

export function generateVisitorIcal(slot: SlotForCal): string {
  return generateIcal(toVisitorEvent(slot))
}

export function buildGoogleCalendarUrl(slot: SlotForCal): string {
  return buildEventUrl(toVisitorEvent(slot))
}
