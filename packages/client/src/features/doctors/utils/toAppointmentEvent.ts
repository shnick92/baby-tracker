import type { CalendarEvent } from '@lib/utils/calendarExport'

import type { DoctorAppointment } from '../useDoctors'
import { formatDoctorLocation } from './formatDoctorLocation'

// Maps an appointment to the shape the calendar export helpers expect. The
// summary always leads with the doctor's name so it is recognisable in a
// crowded calendar; the title (e.g. "20-week scan") follows when set.
export function toAppointmentEvent(appt: DoctorAppointment): CalendarEvent {
  return {
    id: appt.id,
    summary: appt.title ? `${appt.doctor.name} — ${appt.title}` : `${appt.doctor.name} appointment`,
    date: appt.date,
    startTime: appt.startTime,
    endTime: appt.endTime,
    description: appt.notes,
    location: formatDoctorLocation(appt.doctor),
  }
}
