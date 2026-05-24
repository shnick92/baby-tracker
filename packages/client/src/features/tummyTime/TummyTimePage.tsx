import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { toDatetimeLocal } from '@lib/utils'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useTummyTimeLogs } from './useTummyTimeLogs'
import { TummyTimeSkeleton } from './TummyTimeSkeleton'

function fmtSec(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function fmtTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtTimeRange(start: string, end: string | null): string {
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return end ? `${fmt(new Date(start))} – ${fmt(new Date(end))}` : `Started ${fmt(new Date(start))}`
}

const editSchema = z.object({
  startedAt: z.string().min(1, 'Required'),
  endedAt: z.string().optional(),
  notes: z.string().max(500, 'Max 500 chars').optional(),
})
type EditForm = z.infer<typeof editSchema>

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'

export function TummyTimePage() {
  const { babyId } = useAuthStore()
  const {
    logs, isLoading, activeSession, totalTodaySec, completedToday,
    startMutation, endMutation, editMutation, deleteMutation,
  } = useTummyTimeLogs(babyId!)

  const [editingId, setEditingId] = useState<string | null>(null)
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const elapsed = useElapsedSeconds(activeSession?.startedAt)

  const handleStartEdit = (log: (typeof logs)[0]) => {
    setEditingId(log.id)
    editForm.reset({
      startedAt: toDatetimeLocal(log.startedAt),
      endedAt: log.endedAt ? toDatetimeLocal(log.endedAt) : '',
      notes: log.notes ?? '',
    })
  }

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        startedAt: new Date(values.startedAt).toISOString(),
        endedAt: values.endedAt ? new Date(values.endedAt).toISOString() : undefined,
        notes: values.notes || null,
      },
      { onSuccess: () => { setEditingId(null); editForm.reset() } },
    )
  })

  const recentLogs = logs.filter((l) => l.endedAt).slice(0, 8)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tummy Time</h1>
        {totalTodaySec > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Today · {fmtSec(totalTodaySec)} total · {completedToday.length} session{completedToday.length !== 1 ? 's' : ''}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <TummyTimeSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-3xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Timer controls */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">

            {activeSession ? (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800/50 px-4 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    Tummy time active
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">
                    In progress
                  </span>
                </div>
                <p className="text-[52px] font-thin tabular-nums text-gray-900 dark:text-gray-100 leading-none mb-6 tracking-tight">
                  {fmtTimer(elapsed)}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => deleteMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => endMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.97]"
                  >
                    Stop
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="w-full py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold disabled:opacity-50 transition-all active:scale-[0.97] shadow-sm shadow-orange-200 dark:shadow-none flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🐢</span>
                <span>Start Tummy Time</span>
              </button>
            )}

            {/* Today's total */}
            {totalTodaySec > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total today</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-orange-500 tabular-nums leading-none">
                    {fmtSec(totalTodaySec)}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    · {completedToday.length} session{completedToday.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Goal: 20–30 min/day</p>
              </div>
            )}
          </div>

          {/* Log list */}
          <div className="mt-4 md:mt-0">
            {recentLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Recent sessions
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {recentLogs.map((log) => {
                    if (editingId === log.id) {
                      return (
                        <form
                          key={log.id}
                          noValidate
                          onSubmit={onEditSubmit}
                          className="px-4 py-3 space-y-3"
                        >
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit session
                          </p>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
                            <input
                              type="datetime-local"
                              {...editForm.register('startedAt')}
                              className={`${inputCls} ${editForm.formState.errors.startedAt ? 'border-red-400 focus:ring-red-400' : ''}`}
                            />
                            {editForm.formState.errors.startedAt && (
                              <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.startedAt.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
                            <input type="datetime-local" {...editForm.register('endedAt')} className={inputCls} />
                          </div>
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            {...editForm.register('notes')}
                            className={`${inputCls} ${editForm.formState.errors.notes ? 'border-red-400 focus:ring-red-400' : ''}`}
                          />
                          {editForm.formState.errors.notes && (
                            <p className="text-xs text-red-500 -mt-2 text-right">{editForm.formState.errors.notes.message}</p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={editMutation.isPending}
                              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {editMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); editForm.reset() }}
                              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )
                    }

                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-base flex-shrink-0">
                          🐢
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                            {fmtSec(log.durationSec ?? 0)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {fmtTimeRange(log.startedAt, log.endedAt)}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{log.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(log)}
                            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-orange-400 dark:hover:text-orange-500 transition-colors"
                            aria-label="Edit"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(log.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors"
                            aria-label="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
