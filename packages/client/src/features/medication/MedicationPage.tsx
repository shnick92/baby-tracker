import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useMedicationLogs } from './useMedicationLogs'
import { MedicationSkeleton } from './MedicationSkeleton'
import type { MedicationLog } from './useMedicationLogs'

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500'

const logSchema = z.object({
  name: z.string().min(1, 'Medication name required').max(100, 'Max 100 characters'),
  dosageNote: z.string().max(100, 'Max 100 characters').optional(),
  givenAt: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})
type LogFormValues = z.infer<typeof logSchema>

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function timeAgo(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

export function MedicationPage() {
  const { babyId } = useAuthStore()
  const { logs, isLoading, todayLogs, knownNames, logMutation, editMutation, deleteMutation } =
    useMedicationLogs(babyId!)

  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<MedicationLog | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: { name: '', dosageNote: '', givenAt: toLocalDatetimeValue(new Date()), notes: '' },
  })

  const editForm = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
  })

  const handleOpenForm = () => {
    form.reset({ name: '', dosageNote: '', givenAt: toLocalDatetimeValue(new Date()), notes: '' })
    setShowForm(true)
  }

  const handleNameInput = (value: string) => {
    if (!value.trim()) { setNameSuggestions([]); return }
    const lower = value.toLowerCase()
    setNameSuggestions(knownNames.filter((n) => n.toLowerCase().includes(lower) && n.toLowerCase() !== lower))
  }

  const handleSuggestionPick = (name: string) => {
    form.setValue('name', name, { shouldValidate: true })
    setNameSuggestions([])
    nameInputRef.current?.blur()
  }

  const handleSubmit = form.handleSubmit((values) => {
    const givenAt = values.givenAt
      ? new Date(values.givenAt).toISOString()
      : undefined
    logMutation.mutate(
      {
        name: values.name.trim(),
        dosageNote: values.dosageNote?.trim() || undefined,
        givenAt,
        notes: values.notes?.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          form.reset()
          setNameSuggestions([])
        },
      },
    )
  })

  const handleStartEdit = (log: MedicationLog) => {
    setEditingLog(log)
    editForm.reset({
      name: log.name,
      dosageNote: log.dosageNote ?? '',
      givenAt: toLocalDatetimeValue(new Date(log.givenAt)),
      notes: log.notes ?? '',
    })
  }

  const handleSaveEdit = editForm.handleSubmit((values) => {
    if (!editingLog) return
    editMutation.mutate(
      {
        id: editingLog.id,
        name: values.name.trim(),
        dosageNote: values.dosageNote?.trim() || null,
        givenAt: values.givenAt ? new Date(values.givenAt).toISOString() : undefined,
        notes: values.notes?.trim() || null,
      },
      { onSuccess: () => setEditingLog(null) },
    )
  })

  const lastGiven = logs[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Medication</h1>
          {todayLogs.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Today · {todayLogs.length} {todayLogs.length === 1 ? 'dose' : 'doses'}
            </p>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <MedicationSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-5xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Left column: summary + log button */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">

            {/* Summary card */}
            {lastGiven && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                  Last given
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {lastGiven.name}
                    </p>
                    {lastGiven.dosageNote && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{lastGiven.dosageNote}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {timeAgo(lastGiven.givenAt)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatTime(lastGiven.givenAt)}
                    </p>
                  </div>
                </div>
                {todayLogs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {todayLogs.length} {todayLogs.length === 1 ? 'dose' : 'doses'} today
                      {todayLogs.length > 1 && (
                        <span className="ml-1">
                          · {Array.from(new Set(todayLogs.map((l) => l.name))).join(', ')}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Log button / form */}
            {!showForm ? (
              <button
                type="button"
                onClick={handleOpenForm}
                className="w-full py-4 rounded-2xl bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                + Log Medication
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Log medication
                </p>

                {/* Name with autocomplete */}
                <div className="relative">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Medication name <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...form.register('name', {
                      onChange: (e) => handleNameInput(e.target.value),
                    })}
                    ref={(el) => {
                      form.register('name').ref(el)
                      nameInputRef.current = el
                    }}
                    placeholder="e.g. Vitamin D"
                    autoComplete="off"
                    className={`${inputCls} ${form.formState.errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500 mt-1 text-right">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                  {nameSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                      {nameSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onMouseDown={() => handleSuggestionPick(name)}
                          className="w-full px-3 py-2.5 text-sm text-left text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dosage */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Dosage <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    {...form.register('dosageNote')}
                    placeholder="e.g. 0.5 mL, 1 drop, 2.5 mg"
                    className={`${inputCls} ${form.formState.errors.dosageNote ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {form.formState.errors.dosageNote && (
                    <p className="text-xs text-red-500 mt-1 text-right">
                      {form.formState.errors.dosageNote.message}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Time</label>
                  <input
                    {...form.register('givenAt')}
                    type="datetime-local"
                    className={inputCls}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Notes <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    {...form.register('notes')}
                    placeholder="Any observations…"
                    className={`${inputCls} ${form.formState.errors.notes ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {form.formState.errors.notes && (
                    <p className="text-xs text-red-500 mt-1 text-right">
                      {form.formState.errors.notes.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={logMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {logMutation.isPending ? 'Logging…' : 'Log Medication'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setNameSuggestions([]) }}
                    className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column: log list */}
          <div className="mt-4 md:mt-0">
            {logs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Recent logs
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {logs.slice(0, 20).map((log) => {
                    if (editingLog?.id === log.id) {
                      return (
                        <div key={log.id} className="px-4 py-3 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit log
                          </p>

                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                            <input
                              {...editForm.register('name')}
                              className={`${inputCls} ${editForm.formState.errors.name ? 'border-red-400 dark:border-red-500' : ''}`}
                            />
                            {editForm.formState.errors.name && (
                              <p className="text-xs text-red-500 mt-1 text-right">
                                {editForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Dosage</label>
                            <input
                              {...editForm.register('dosageNote')}
                              placeholder="e.g. 0.5 mL, 1 drop"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Time</label>
                            <input
                              {...editForm.register('givenAt')}
                              type="datetime-local"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                            <input
                              {...editForm.register('notes')}
                              className={inputCls}
                            />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={editMutation.isPending}
                              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {editMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLog(null)}
                              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-base flex-shrink-0">
                          💊
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                            {log.name}
                          </p>
                          {log.dosageNote && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {log.dosageNote}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                          {formatTime(log.givenAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${log.name} log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label={`Delete ${log.name} log`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {logs.length === 0 && !showForm && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">💊</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">No medication logs yet</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Tap "Log Medication" to get started</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
