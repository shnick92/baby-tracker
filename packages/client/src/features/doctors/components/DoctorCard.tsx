import { Stethoscope, Star, MapPin, Phone, CalendarPlus } from 'lucide-react'

import { TrashIcon, PencilIcon } from '@components/icons'

import type { Doctor } from '../useDoctors'
import { formatDoctorLocation } from '../utils/formatDoctorLocation'

type Props = {
  doctor: Doctor
  onChoose: (chosen: boolean) => void
  onSchedule: () => void
  onEdit: () => void
  onDelete: () => void
}

const iconBtnCls =
  'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 transition-colors'

export function DoctorCard({ doctor, onChoose, onSchedule, onEdit, onDelete }: Props) {
  const location = formatDoctorLocation(doctor)
  const mapsHref = doctor.address ? `https://maps.google.com/?q=${encodeURIComponent(doctor.address)}` : null

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border px-4 py-4 space-y-3 ${
        doctor.isChosen
          ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800'
          : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            doctor.isChosen
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
          }`}
        >
          <Stethoscope size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">{doctor.name}</p>
            {doctor.isChosen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Star size={10} fill="currentColor" /> Our doctor
              </span>
            )}
          </div>
          {doctor.specialty && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{doctor.specialty}</p>
          )}
        </div>
        <button
          onClick={() => onChoose(!doctor.isChosen)}
          className={`${iconBtnCls} ${
            doctor.isChosen
              ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : 'hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
          }`}
          aria-label={doctor.isChosen ? `Unmark ${doctor.name} as our doctor` : `Mark ${doctor.name} as our doctor`}
          aria-pressed={doctor.isChosen}
          title={doctor.isChosen ? 'Our doctor' : 'Choose this doctor'}
        >
          <Star size={16} fill={doctor.isChosen ? 'currentColor' : 'none'} />
        </button>
      </div>

      {(location || doctor.phone) && (
        <div className="space-y-1">
          {location && (
            <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin size={13} className="flex-shrink-0 mt-0.5 text-gray-300 dark:text-gray-600" />
              {mapsHref ? (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400">
                  {location}
                </a>
              ) : (
                <span>{location}</span>
              )}
            </p>
          )}
          {doctor.phone && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Phone size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
              <a href={`tel:${doctor.phone}`} className="hover:text-blue-500 dark:hover:text-blue-400">{doctor.phone}</a>
            </p>
          )}
        </div>
      )}

      {doctor.notes && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">{doctor.notes}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSchedule}
          className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <CalendarPlus size={15} />
          Add appointment
        </button>
        <button
          onClick={onEdit}
          className={`${iconBtnCls} hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
          aria-label={`Edit ${doctor.name}`}
        >
          <PencilIcon />
        </button>
        <button
          onClick={onDelete}
          className={`${iconBtnCls} hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
          aria-label={`Delete ${doctor.name}`}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}
