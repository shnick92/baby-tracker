import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'

import { generateIcal, buildGoogleCalendarUrl, downloadIcal, type CalendarEvent } from '@lib/utils/calendarExport'

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

const iconBtnCls =
  'w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'

type Props = {
  event: CalendarEvent
  filename: string
}

// One-tap export of a dated event to the user's calendar. iOS gets the .ics
// directly (Safari opens it in Calendar); everywhere else a menu offers
// iCal/Apple or a Google Calendar link.
export function AddToCalendarButton({ event, filename }: Props) {
  const [open, setOpen] = useState(false)

  const triggerIcal = () => {
    downloadIcal(generateIcal(event), filename)
    setOpen(false)
  }

  if (isIOS) {
    return (
      <button onClick={triggerIcal} className={`flex-shrink-0 ${iconBtnCls}`} aria-label="Add to Calendar" title="Add to Calendar">
        <CalendarPlus size={15} />
      </button>
    )
  }

  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen((v) => !v)} className={iconBtnCls} aria-label="Add to Calendar" title="Add to Calendar">
        <CalendarPlus size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
            <button
              onClick={triggerIcal}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <CalendarPlus size={13} className="text-blue-400" />
              iCal / Apple
            </button>
            <a
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <CalendarPlus size={13} className="text-blue-400" />
              Google Calendar
            </a>
          </div>
        </>
      )}
    </div>
  )
}
