import { AddToCalendarButton } from '@components/AddToCalendarButton'
import { TrashIcon, PencilIcon } from '@components/icons'
import { parseDateParts, formatMonthAbbr, formatTime } from '@lib/utils/localDate'

import type { DoctorAppointment } from '../useDoctors'
import { formatDoctorLocation } from '../utils/formatDoctorLocation'
import { toAppointmentEvent } from '../utils/toAppointmentEvent'

type Props = {
  appointment: DoctorAppointment
  isToday: boolean
  isPast: boolean
  onEdit: () => void
  onDelete: () => void
}

function DateBox({ dateStr, isToday, isPast }: { dateStr: string; isToday: boolean; isPast: boolean }) {
  const { day } = parseDateParts(dateStr)
  const tone = isToday
    ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
    : isPast
    ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    : 'bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700'
  const labelTone = isToday
    ? 'text-green-500 dark:text-green-400'
    : isPast
    ? 'text-gray-400 dark:text-gray-500'
    : 'text-rose-500 dark:text-rose-400'
  return (
    <div className={`flex-shrink-0 rounded-xl px-3 py-2 text-center w-[60px] border ${tone}`}>
      <div className={`text-[10px] font-semibold uppercase ${labelTone}`}>{isToday ? 'Today' : formatMonthAbbr(dateStr)}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">{day}</div>
    </div>
  )
}

export function AppointmentRow({ appointment, isToday, isPast, onEdit, onDelete }: Props) {
  const location = formatDoctorLocation(appointment.doctor)
  const filename = `${appointment.doctor.name.replace(/\s+/g, '-')}-appointment.ics`

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 px-4 py-3 ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <DateBox dateStr={appointment.date} isToday={isToday} isPast={isPast} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
          {appointment.title ?? 'Appointment'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {appointment.doctor.name}
          {appointment.startTime && (
            <>
              {' · '}
              {formatTime(appointment.startTime)}
              {appointment.endTime && ` – ${formatTime(appointment.endTime)}`}
            </>
          )}
        </p>
        {location && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{location}</p>}
        {appointment.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{appointment.notes}</p>}
      </div>
      <AddToCalendarButton event={toAppointmentEvent(appointment)} filename={filename} />
      <button
        onClick={onEdit}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        aria-label={`Edit appointment with ${appointment.doctor.name}`}
      >
        <PencilIcon />
      </button>
      <button
        onClick={onDelete}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        aria-label={`Delete appointment with ${appointment.doctor.name}`}
      >
        <TrashIcon />
      </button>
    </div>
  )
}
