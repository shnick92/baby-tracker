import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { formatDuration, formatTimeAgo, formatOz, toDatetimeLocal } from '@lib/utils'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useFeedingLogs } from './useFeedingLogs'
import { FeedingSkeleton } from './FeedingSkeleton'

const bottleSchema = z.object({ volumeOz: z.coerce.number().min(0.1).max(16) })
const pumpSchema = z.object({
  volumeOz: z.coerce.number().min(0).max(32),
  durationMin: z.coerce.number().min(0).optional(),
})
const editFeedingSchema = z.object({
  type: z.enum(['BREAST_LEFT', 'BREAST_RIGHT', 'BOTTLE', 'PUMP']),
  startedAt: z.string().min(1, 'Required'),
  endedAt: z.string().optional(),
  volumeOz: z.coerce.number().min(0).max(32).optional(),
  notes: z.string().optional(),
})

type BottleForm = z.infer<typeof bottleSchema>
type PumpForm = z.infer<typeof pumpSchema>
type EditFeedingForm = z.infer<typeof editFeedingSchema>

const FEEDING_TYPE_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Left',
  BREAST_RIGHT: 'Right',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function FeedingPage() {
  const { babyId } = useAuthStore()
  const { logs, isLoading, activeSession, startMutation, endMutation, logBottleMutation, logPumpMutation, editMutation, deleteMutation } =
    useFeedingLogs(babyId!)

  const [showBottleForm, setShowBottleForm] = useState(false)
  const [showPumpForm, setShowPumpForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const bottleForm = useForm<BottleForm>({ resolver: zodResolver(bottleSchema) })
  const pumpForm = useForm<PumpForm>({ resolver: zodResolver(pumpSchema) })
  const editForm = useForm<EditFeedingForm>({ resolver: zodResolver(editFeedingSchema) })

  const elapsed = useElapsedSeconds(activeSession?.startedAt)

  const completedLogs = logs.filter((l) => l.endedAt || l.type === 'BOTTLE' || l.type === 'PUMP')
  const lastFed = completedLogs[0]

  const handleBreastTap = (side: 'BREAST_LEFT' | 'BREAST_RIGHT') => {
    if (activeSession) {
      endMutation.mutate(activeSession.id)
    } else {
      startMutation.mutate(side)
    }
  }

  const onBottleSubmit = bottleForm.handleSubmit((values) => {
    logBottleMutation.mutate(values.volumeOz, {
      onSuccess: () => { bottleForm.reset(); setShowBottleForm(false) },
    })
  })

  const onPumpSubmit = pumpForm.handleSubmit((values) => {
    logPumpMutation.mutate(
      { volumeOz: values.volumeOz, durationSec: values.durationMin ? values.durationMin * 60 : undefined },
      { onSuccess: () => { pumpForm.reset(); setShowPumpForm(false) } },
    )
  })

  const handleStartEdit = (log: (typeof completedLogs)[0]) => {
    setEditingId(log.id)
    editForm.reset({
      type: log.type,
      startedAt: toDatetimeLocal(log.startedAt),
      endedAt: log.endedAt ? toDatetimeLocal(log.endedAt) : '',
      volumeOz: log.volumeOz ?? undefined,
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
        volumeOz: values.volumeOz ?? null,
        notes: values.notes || null,
      },
      { onSuccess: () => { setEditingId(null); editForm.reset() } },
    )
  })

  const watchedType = editForm.watch('type')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Feeding</h1>
        {lastFed && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last fed {formatTimeAgo(lastFed.endedAt ?? lastFed.startedAt)}
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 md:max-w-2xl md:px-8">
        {isLoading ? (
          <FeedingSkeleton />
        ) : (
          <>
            {/* Active timer */}
            {activeSession && (
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800 px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {FEEDING_TYPE_LABEL[activeSession.type]} breast · feeding
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 tabular-nums mt-0.5">
                    {formatDuration(elapsed)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => endMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="h-12 px-5 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="text-xs text-blue-400 dark:text-blue-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    Cancel session
                  </button>
                </div>
              </div>
            )}

            {/* Quick-log buttons */}
            <div className="grid grid-cols-2 gap-3">
              {(['BREAST_LEFT', 'BREAST_RIGHT'] as const).map((side) => {
                const isActive = activeSession?.type === side
                return (
                  <button
                    key={side}
                    onClick={() => handleBreastTap(side)}
                    disabled={startMutation.isPending || endMutation.isPending || (!!activeSession && !isActive)}
                    className={`h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'
                    }`}
                  >
                    <span className="text-xl">{side === 'BREAST_LEFT' ? '👈' : '👉'}</span>
                    <span>{side === 'BREAST_LEFT' ? 'Left' : 'Right'}</span>
                  </button>
                )
              })}

              <button
                onClick={() => { setShowBottleForm(!showBottleForm); setShowPumpForm(false) }}
                disabled={!!activeSession}
                className={`h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 ${
                  showBottleForm
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'
                }`}
              >
                <span className="text-xl">🍼</span>
                <span>Bottle</span>
              </button>

              <button
                onClick={() => { setShowPumpForm(!showPumpForm); setShowBottleForm(false) }}
                disabled={!!activeSession}
                className={`h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 ${
                  showPumpForm
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'
                }`}
              >
                <span className="text-xl">🔄</span>
                <span>Pump</span>
              </button>
            </div>

            {/* Inline bottle form */}
            {showBottleForm && (
              <form
                noValidate
                onSubmit={onBottleSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3"
              >
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Volume
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="16"
                    placeholder="oz"
                    autoFocus
                    {...bottleForm.register('volumeOz')}
                    className={inputCls}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">oz</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={logBottleMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {logBottleMutation.isPending ? 'Logging…' : 'Log bottle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { bottleForm.reset(); setShowBottleForm(false) }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Inline pump form */}
            {showPumpForm && (
              <form
                noValidate
                onSubmit={onPumpSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3"
              >
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Pump session
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="32"
                      placeholder="oz"
                      autoFocus
                      {...pumpForm.register('volumeOz')}
                      className={inputCls}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">oz</span>
                  </div>
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="min"
                      {...pumpForm.register('durationMin')}
                      className={inputCls}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">min</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={logPumpMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {logPumpMutation.isPending ? 'Logging…' : 'Log pump'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { pumpForm.reset(); setShowPumpForm(false) }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Log list */}
            {completedLogs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 px-1">
                  Recent feedings
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                  {completedLogs.slice(0, 10).map((log) =>
                    editingId === log.id ? (
                      <form
                        key={log.id}
                        noValidate
                        onSubmit={onEditSubmit}
                        className="px-4 py-3 space-y-3"
                      >
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Edit feeding
                        </p>

                        {/* Type */}
                        <select
                          {...editForm.register('type')}
                          className={inputCls}
                        >
                          <option value="BREAST_LEFT">Left breast</option>
                          <option value="BREAST_RIGHT">Right breast</option>
                          <option value="BOTTLE">Bottle</option>
                          <option value="PUMP">Pump</option>
                        </select>

                        {/* Start time */}
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
                          <input
                            type="datetime-local"
                            {...editForm.register('startedAt')}
                            className={inputCls}
                          />
                        </div>

                        {/* End time */}
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
                          <input
                            type="datetime-local"
                            {...editForm.register('endedAt')}
                            className={inputCls}
                          />
                        </div>

                        {/* Volume — only for Bottle/Pump */}
                        {(watchedType === 'BOTTLE' || watchedType === 'PUMP') && (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="32"
                              placeholder="oz"
                              {...editForm.register('volumeOz')}
                              className={inputCls}
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">oz</span>
                          </div>
                        )}

                        {/* Notes */}
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
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-sm flex-shrink-0">
                          {log.type === 'BREAST_LEFT' ? '👈' : log.type === 'BREAST_RIGHT' ? '👉' : log.type === 'BOTTLE' ? '🍼' : '🔄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {FEEDING_TYPE_LABEL[log.type]}
                            {log.volumeOz != null && <span className="text-gray-500 dark:text-gray-400 font-normal"> · {formatOz(log.volumeOz)}</span>}
                            {log.durationSec != null && log.type !== 'PUMP' && <span className="text-gray-500 dark:text-gray-400 font-normal"> · {formatDuration(log.durationSec)}</span>}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTimeAgo(log.endedAt ?? log.startedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${FEEDING_TYPE_LABEL[log.type]} log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label={`Delete ${FEEDING_TYPE_LABEL[log.type]} log`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
