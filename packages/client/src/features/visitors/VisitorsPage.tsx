import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { TrashIcon } from '@components/icons'

import { useVisitors } from './useVisitors'
import { parseDateParts, formatMonthAbbr, formatMonthYear, formatTime, todayDateString, groupByMonth } from './utils'

const addVisitorSchema = z.object({
  name: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
})
type AddVisitorForm = z.infer<typeof addVisitorSchema>


function DateBox({ dateStr, isToday }: { dateStr: string; isToday: boolean }) {
  const { day } = parseDateParts(dateStr)
  const monthAbbr = formatMonthAbbr(dateStr)
  return (
    <div
      className={`flex-shrink-0 rounded-xl px-3 py-2 text-center min-w-[52px] border ${
        isToday
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-green-500' : 'text-blue-500'}`}>
        {isToday ? 'Today' : monthAbbr}
      </div>
      <div className="text-2xl font-semibold text-gray-900 leading-tight">{day}</div>
    </div>
  )
}

export function VisitorsPage() {
  const [addingSlot, setAddingSlot] = useState(false)
  const { slots, isLoading, deleteMutation, addMutation } = useVisitors()

  const { register, handleSubmit, reset, watch, setValue } = useForm<AddVisitorForm>({
    resolver: zodResolver(addVisitorSchema),
    defaultValues: { name: '', date: '', startTime: '', endTime: '', notes: '' },
  })

  const startTime = watch('startTime')
  const [watchedName, watchedDate] = watch(['name', 'date'])

  const onSubmit = handleSubmit((values) => {
    const startISO = values.startTime
      ? new Date(`${values.date}T${values.startTime}`).toISOString()
      : undefined
    const endISO = values.endTime
      ? new Date(`${values.date}T${values.endTime}`).toISOString()
      : undefined
    addMutation.mutate(
      {
        name: values.name.trim(),
        date: values.date,
        startTime: startISO,
        endTime: endISO,
        notes: values.notes?.trim() || undefined,
      },
      { onSuccess: () => { reset(); setAddingSlot(false) } },
    )
  })

  const handleStartTimeChange = (value: string) => {
    const currentEnd = watch('endTime')
    if (currentEnd && currentEnd <= value) setValue('endTime', '')
  }

  const grouped = groupByMonth(slots)
  const today = todayDateString()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Visitor Schedule</h1>
        <span className="text-sm text-gray-500">{slots.length} {slots.length === 1 ? 'visit' : 'visits'}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 && !addingSlot ? (
          <div className="text-center py-12 text-gray-400 text-sm">No visits scheduled yet</div>
        ) : (
          grouped.map(([monthKey, monthSlots]) => (
            <div key={monthKey}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                {formatMonthYear(monthKey)}
              </h2>
              <div className="space-y-2">
                {monthSlots.map((slot) => {
                  const isToday = slot.date === today
                  return (
                    <div
                      key={slot.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 px-4 py-3"
                    >
                      <DateBox dateStr={slot.date} isToday={isToday} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{slot.name}</p>
                        {slot.startTime && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatTime(slot.startTime)}
                            {slot.endTime && ` – ${formatTime(slot.endTime)}`}
                          </p>
                        )}
                        {slot.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{slot.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(slot.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        aria-label={`Delete ${slot.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {addingSlot ? (
          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
          >
            <input
              autoFocus
              type="text"
              placeholder="Visitor name *"
              {...register('name')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              data-testid="visit-date"
              {...register('date')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="time"
                data-testid="start-time"
                placeholder="From (optional)"
                {...register('startTime', {
                  onChange: (e) => handleStartTimeChange(e.target.value),
                })}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <span className="self-center text-gray-400 text-sm">to</span>
              <input
                type="time"
                data-testid="end-time"
                min={startTime || undefined}
                disabled={!startTime}
                {...register('endTime')}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <p className="text-xs text-gray-400 -mt-1">Times are optional</p>
            <input
              type="text"
              placeholder="Notes (optional)"
              {...register('notes')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!watchedName?.trim() || !watchedDate || addMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {addMutation.isPending ? 'Saving…' : 'Add visit'}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setAddingSlot(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingSlot(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            + Schedule a visit
          </button>
        )}
      </div>
    </div>
  )
}
