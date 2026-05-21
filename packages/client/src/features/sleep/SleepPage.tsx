import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { formatDuration, formatTimeAgo, toDatetimeLocal } from '@lib/utils'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useSleepLogs } from './useSleepLogs'
import { SleepSkeleton } from './SleepSkeleton'

const editSleepSchema = z.object({
  type: z.enum(['NAP', 'NIGHT']),
  startedAt: z.string().min(1, 'Required'),
  endedAt: z.string().optional(),
  notes: z.string().optional(),
})

type EditSleepForm = z.infer<typeof editSleepSchema>

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function SleepPage() {
  const { babyId } = useAuthStore()
  const { logs, isLoading, activeSession, lastEnded, startMutation, endMutation, editMutation, deleteMutation } = useSleepLogs(babyId!)

  const [editingId, setEditingId] = useState<string | null>(null)

  const editForm = useForm<EditSleepForm>({ resolver: zodResolver(editSleepSchema) })

  const sleepElapsed = useElapsedSeconds(activeSession?.startedAt)
  const awakeElapsed = useElapsedSeconds(lastEnded?.endedAt ?? undefined)

  const completedLogs = logs.filter((l) => l.endedAt)

  const handleStartEdit = (log: (typeof completedLogs)[0]) => {
    setEditingId(log.id)
    editForm.reset({
      type: log.type,
      startedAt: toDatetimeLocal(log.startedAt),
      endedAt: log.endedAt ? toDatetimeLocal(log.endedAt) : '',
      notes: log.notes ?? '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    editForm.reset()
  }

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        type: values.type,
        startedAt: new Date(values.startedAt).toISOString(),
        endedAt: values.endedAt ? new Date(values.endedAt).toISOString() : undefined,
        notes: values.notes || null,
      },
      { onSuccess: () => { setEditingId(null); editForm.reset() } },
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sleep</h1>
        {!activeSession && lastEnded && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Awake {formatDuration(awakeElapsed)}
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 md:max-w-2xl md:px-8">
        {isLoading ? (
          <SleepSkeleton />
        ) : (
          <>
            {/* Active sleep timer */}
            {activeSession && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {activeSession.type === 'NAP' ? 'Napping' : 'Night sleep'}
                  </p>
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums mt-0.5">
                    {formatDuration(sleepElapsed)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => endMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="h-12 px-5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Wake
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="text-xs text-indigo-400 dark:text-indigo-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    Cancel session
                  </button>
                </div>
              </div>
            )}

            {/* Wake window indicator */}
            {!activeSession && lastEnded && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 px-4 py-3 flex items-center gap-3">
                <span className="text-lg">☀️</span>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Awake for {formatDuration(awakeElapsed)}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Last {lastEnded.type === 'NAP' ? 'nap' : 'sleep'} was{' '}
                    {lastEnded.endedAt
                      ? formatDuration(
                          Math.round(
                            (new Date(lastEnded.endedAt).getTime() - new Date(lastEnded.startedAt).getTime()) / 1000,
                          ),
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick-log buttons */}
            <div className="grid grid-cols-2 gap-3">
              {(['NAP', 'NIGHT'] as const).map((type) => {
                const isActive = activeSession?.type === type
                return (
                  <button
                    key={type}
                    onClick={() => (activeSession ? endMutation.mutate(activeSession.id) : startMutation.mutate(type))}
                    disabled={startMutation.isPending || endMutation.isPending || (!!activeSession && !isActive)}
                    className={`h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'
                    }`}
                  >
                    <span className="text-xl">{type === 'NAP' ? '😴' : '🌙'}</span>
                    <span>{type === 'NAP' ? 'Nap' : 'Night sleep'}</span>
                  </button>
                )
              })}
            </div>

            {/* Log list */}
            {completedLogs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 px-1">
                  Recent sleep
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                  {completedLogs.slice(0, 8).map((log) => {
                    const dur = log.endedAt
                      ? Math.round((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                      : null

                    if (editingId === log.id) {
                      return (
                        <form
                          key={log.id}
                          noValidate
                          onSubmit={onEditSubmit}
                          className="px-4 py-3 space-y-3"
                        >
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit sleep log
                          </p>

                          <select {...editForm.register('type')} className={inputCls}>
                            <option value="NAP">Nap</option>
                            <option value="NIGHT">Night sleep</option>
                          </select>

                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
                            <input
                              type="datetime-local"
                              {...editForm.register('startedAt')}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
                            <input
                              type="datetime-local"
                              {...editForm.register('endedAt')}
                              className={inputCls}
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            {...editForm.register('notes')}
                            className={inputCls}
                          />

                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={editMutation.isPending}
                              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
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
                      )
                    }

                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-sm flex-shrink-0">
                          {log.type === 'NAP' ? '😴' : '🌙'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {log.type === 'NAP' ? 'Nap' : 'Night sleep'}
                            {dur != null && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal"> · {formatDuration(dur)}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTimeAgo(log.endedAt ?? log.startedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${log.type === 'NAP' ? 'nap' : 'night sleep'} log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label={`Delete ${log.type === 'NAP' ? 'nap' : 'night sleep'} log`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
