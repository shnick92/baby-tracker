import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { TrashIcon, PencilIcon } from '@components/icons'
import { formatDueMonthYear } from '@lib/utils/formatDate'
import { usePregnancyStatus } from '@features/pregnancy'

import { useVisitors } from './useVisitors'
import { VisitorsSkeleton } from './VisitorsSkeleton'
import {
  parseDateParts,
  formatMonthAbbr,
  formatMonthYear,
  formatTime,
  todayDateString,
  extractTimeInput,
  groupByMonth,
} from './utils'

const visitorSchema = z.object({
  name: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
})
type VisitorForm = z.infer<typeof visitorSchema>

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

function buildSlotPayload(values: VisitorForm) {
  return {
    name: values.name.trim(),
    date: values.date,
    startTime: values.startTime ? toISO(values.date, values.startTime) : undefined,
    endTime: values.endTime ? toISO(values.date, values.endTime) : undefined,
    notes: values.notes?.trim() || undefined,
  }
}

function DateBox({ dateStr, isToday }: { dateStr: string; isToday: boolean }) {
  const { day } = parseDateParts(dateStr)
  const monthAbbr = formatMonthAbbr(dateStr)
  return (
    <div
      className={`flex-shrink-0 rounded-xl px-3 py-2 text-center w-[60px] border ${
        isToday
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
      }`}
    >
      <div className={`text-[10px] font-semibold uppercase ${isToday ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'}`}>
        {isToday ? 'Today' : monthAbbr}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">{day}</div>
    </div>
  )
}

export function VisitorsPage() {
  const [addingSlot, setAddingSlot] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { slots, isLoading, deleteMutation, addMutation, editMutation } = useVisitors()
  const { data: pregnancy } = usePregnancyStatus()

  const addForm = useForm<VisitorForm>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { name: '', date: '', startTime: '', endTime: '', notes: '' },
  })
  const addStartTime = addForm.watch('startTime')
  const [addName, addDate] = addForm.watch(['name', 'date'])

  const editForm = useForm<VisitorForm>({
    resolver: zodResolver(visitorSchema),
  })
  const editStartTime = editForm.watch('startTime')

  const grouped = groupByMonth(slots)
  const today = todayDateString()

  const handleStartEdit = (slot: (typeof slots)[number]) => {
    setEditingId(slot.id)
    editForm.reset({
      name: slot.name,
      date: slot.date,
      startTime: extractTimeInput(slot.startTime),
      endTime: extractTimeInput(slot.endTime),
      notes: slot.notes ?? '',
    })
  }

  const handleCancelEdit = () => setEditingId(null)

  const onAddSubmit = addForm.handleSubmit((values) => {
    addMutation.mutate(buildSlotPayload(values), {
      onSuccess: () => { addForm.reset(); setAddingSlot(false) },
    })
  })

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      { id: editingId, ...buildSlotPayload(values) },
      { onSuccess: () => setEditingId(null) },
    )
  })

  const handleAddStartTimeChange = (value: string) => {
    const currentEnd = addForm.getValues('endTime')
    if (currentEnd && currentEnd <= value) addForm.setValue('endTime', '')
  }

  const handleEditStartTimeChange = (value: string) => {
    const currentEnd = editForm.getValues('endTime')
    if (currentEnd && currentEnd <= value) editForm.setValue('endTime', '')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">Visitors</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {pregnancy?.dueDate
              ? `After baby arrives · ${formatDueMonthYear(pregnancy.dueDate)}`
              : 'Visitor schedule'}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6 md:max-w-3xl md:px-8">
        {isLoading ? (
          <VisitorsSkeleton />
        ) : slots.length === 0 && !addingSlot ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-600 text-sm">No visits scheduled yet</div>
        ) : (
          grouped.map(([monthKey, monthSlots]) => (
            <div key={monthKey}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                {formatMonthYear(monthKey)}
              </h2>
              <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {monthSlots.map((slot) => {
                  const isToday = slot.date === today
                  return editingId === slot.id ? (
                    <form
                      key={slot.id}
                      onSubmit={onEditSubmit}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800 p-4 space-y-3"
                    >
                      <div>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Visitor name *"
                          {...editForm.register('name')}
                          className={`${inputCls} ${editForm.formState.errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                        />
                        {editForm.formState.errors.name && (
                          <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="date"
                          {...editForm.register('date')}
                          className={`${inputCls} ${editForm.formState.errors.date ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                        />
                        {editForm.formState.errors.date && (
                          <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.date.message}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          {...editForm.register('startTime', {
                            onChange: (e) => handleEditStartTimeChange(e.target.value),
                          })}
                          className={`flex-1 ${inputCls} [&::-webkit-calendar-picker-indicator]:hidden`}
                        />
                        <span className="self-center text-gray-400 dark:text-gray-500 text-sm">to</span>
                        <input
                          type="time"
                          min={editStartTime || undefined}
                          disabled={!editStartTime}
                          {...editForm.register('endTime')}
                          className={`flex-1 ${inputCls} disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden`}
                        />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">Times are optional</p>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        {...editForm.register('notes')}
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editMutation.isPending}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {editMutation.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={slot.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 px-4 py-3"
                    >
                      <DateBox dateStr={slot.date} isToday={isToday} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">{slot.name}</p>
                        {slot.startTime && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatTime(slot.startTime)}
                            {slot.endTime && ` – ${formatTime(slot.endTime)}`}
                          </p>
                        )}
                        {slot.notes && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{slot.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleStartEdit(slot)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        aria-label={`Edit ${slot.name}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(slot.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            onSubmit={onAddSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3"
          >
            <div>
              <input
                autoFocus
                type="text"
                placeholder="Visitor name *"
                {...addForm.register('name')}
                className={`${inputCls} ${addForm.formState.errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
              />
              {addForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1 text-right">{addForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <input
                type="date"
                data-testid="visit-date"
                {...addForm.register('date')}
                className={`${inputCls} ${addForm.formState.errors.date ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
              />
              {addForm.formState.errors.date && (
                <p className="text-xs text-red-500 mt-1 text-right">{addForm.formState.errors.date.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="time"
                data-testid="start-time"
                placeholder="From (optional)"
                {...addForm.register('startTime', {
                  onChange: (e) => handleAddStartTimeChange(e.target.value),
                })}
                className={`flex-1 ${inputCls} [&::-webkit-calendar-picker-indicator]:hidden`}
              />
              <span className="self-center text-gray-400 dark:text-gray-500 text-sm">to</span>
              <input
                type="time"
                data-testid="end-time"
                min={addStartTime || undefined}
                disabled={!addStartTime}
                {...addForm.register('endTime')}
                className={`flex-1 ${inputCls} disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden`}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">Times are optional</p>
            <input
              type="text"
              placeholder="Notes (optional)"
              {...addForm.register('notes')}
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!addName?.trim() || !addDate || addMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {addMutation.isPending ? 'Saving…' : 'Add visit'}
              </button>
              <button
                type="button"
                onClick={() => { addForm.reset(); setAddingSlot(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingSlot(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            + Schedule a visit
          </button>
        )}
      </div>
    </div>
  )
}
