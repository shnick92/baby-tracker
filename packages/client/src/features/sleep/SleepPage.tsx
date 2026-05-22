import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { formatDuration, toDatetimeLocal } from '@lib/utils'
import { useElapsedMinutes } from '@hooks/useElapsedMinutes'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useSleepLogs } from './useSleepLogs'
import { useSleepSettings } from './useSleepSettings'
import { SleepSkeleton } from './SleepSkeleton'

const editSleepSchema = z.object({
  type: z.enum(['NAP', 'NIGHT']),
  startedAt: z.string().min(1, 'Required'),
  endedAt: z.string().optional(),
  notes: z.string().optional(),
})

type EditSleepForm = z.infer<typeof editSleepSchema>

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

function fmtMin(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function sleepBarColor(durSec: number, idealSec: number): string {
  const pct = (durSec / idealSec) * 100
  if (pct >= 80) return 'bg-green-400 dark:bg-green-500'
  if (pct >= 50) return 'bg-amber-400 dark:bg-amber-500'
  return 'bg-rose-400 dark:bg-rose-500'
}

const settingsSchema = z.object({
  napIdealMinutes: z.coerce.number().int().min(5, 'Min 5 min').max(240, 'Max 240 min'),
  nightIdealMinutes: z.coerce.number().int().min(60, 'Min 60 min').max(720, 'Max 720 min'),
  wakeWindowMaxMinutes: z.coerce.number().int().min(1, 'Min 1 min').max(360, 'Max 360 min'),
})
type SettingsForm = z.infer<typeof settingsSchema>

function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return endedAt
    ? `${fmt(new Date(startedAt))} – ${fmt(new Date(endedAt))}`
    : `Started ${fmt(new Date(startedAt))}`
}

export function SleepPage() {
  const { babyId } = useAuthStore()
  const {
    logs, isLoading, activeSession, lastEnded,
    totalSleepTodaySec, longestStretchSec,
    startMutation, endMutation, editMutation, deleteMutation,
  } = useSleepLogs(babyId!)
  const { settings, updateMutation: updateSettings } = useSleepSettings(babyId!)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const editForm = useForm<EditSleepForm>({ resolver: zodResolver(editSleepSchema) })
  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: settings,
  })

  const sleepMinutes = useElapsedMinutes(activeSession?.startedAt)
  const awakeMinutes = useElapsedMinutes(lastEnded?.endedAt ?? undefined)

  const completedLogs = logs.filter((l) => l.endedAt)

  const wakeWindowPct = awakeMinutes / settings.wakeWindowMaxMinutes
  const napWindowSoon = wakeWindowPct >= 0.8 && wakeWindowPct < 1
  const napWindowExceeded = wakeWindowPct >= 1

  const idealSecForType = (type: 'NAP' | 'NIGHT') =>
    type === 'NAP' ? settings.napIdealMinutes * 60 : settings.nightIdealMinutes * 60

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

  const onSettingsSubmit = settingsForm.handleSubmit((values) => {
    updateSettings.mutate(values, { onSuccess: () => setShowSettings(false) })
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sleep</h1>
          {totalSleepTodaySec > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Today · {formatDuration(totalSleepTodaySec)} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeSession && (
            <span className="text-xs text-purple-500 dark:text-purple-400 font-medium">
              Sleeping · {fmtMin(sleepMinutes)}
            </span>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Sleep settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <SleepSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-5xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Left column: controls */}
          <div className="space-y-4">

            {/* Gear button — tablet only (mobile has it in the header above) */}
            <div className="hidden md:flex justify-end">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Sleep settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>

            {/* Active sleep timer */}
            {activeSession && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800/50 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                    {activeSession.type === 'NAP' ? 'Napping' : 'Night sleep'}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                    In progress
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-[40px] font-thin tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                    {fmtMin(sleepMinutes)}
                  </p>
                  <span className="text-sm text-gray-400 dark:text-gray-500">sleeping</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => deleteMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => endMutation.mutate(activeSession.id)}
                    disabled={endMutation.isPending || deleteMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Wake up
                  </button>
                </div>
              </div>
            )}

            {/* Wake window card — not sleeping */}
            {!activeSession && lastEnded && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800/50 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                    Currently awake
                  </p>
                  {napWindowExceeded && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-medium">
                      Nap overdue
                    </span>
                  )}
                  {napWindowSoon && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                      Nap window soon
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-[40px] font-thin tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                    {fmtMin(awakeMinutes)}
                  </p>
                  <span className="text-sm text-gray-400 dark:text-gray-500">awake</span>
                </div>
                <div className="h-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-purple-500 dark:bg-purple-400"
                    style={{ width: `${Math.min(100, Math.round((awakeMinutes / settings.wakeWindowMaxMinutes) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    Woke {new Date(lastEnded.endedAt!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-purple-500 dark:text-purple-400">Notify after {settings.wakeWindowMaxMinutes} min</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => startMutation.mutate('NAP')}
                    disabled={startMutation.isPending}
                    className="py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold disabled:opacity-40"
                  >
                    Log Nap
                  </button>
                  <button
                    onClick={() => startMutation.mutate('NIGHT')}
                    disabled={startMutation.isPending}
                    className="py-3.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Night Sleep
                  </button>
                </div>
              </div>
            )}

            {/* No sleep yet — fresh state */}
            {!activeSession && !lastEnded && (
              <div className="grid grid-cols-2 gap-3">
                {(['NAP', 'NIGHT'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => startMutation.mutate(type)}
                    disabled={startMutation.isPending}
                    className="h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm"
                  >
                    <span className="text-xl">{type === 'NAP' ? '😴' : '🌙'}</span>
                    <span>{type === 'NAP' ? 'Nap' : 'Night sleep'}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Settings panel */}
            {showSettings && (
              <form
                noValidate
                onSubmit={onSettingsSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Sleep targets</p>
                  <button type="button" onClick={() => setShowSettings(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">Done</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Nap ideal (min)</label>
                    <input
                      type="number" min="5" max="240"
                      {...settingsForm.register('napIdealMinutes')}
                      className={`${inputCls} ${settingsForm.formState.errors.napIdealMinutes ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                    />
                    {settingsForm.formState.errors.napIdealMinutes && (
                      <p className="text-xs text-red-500 mt-1 text-right">{settingsForm.formState.errors.napIdealMinutes.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Night ideal (min)</label>
                    <input
                      type="number" min="60" max="720"
                      {...settingsForm.register('nightIdealMinutes')}
                      className={`${inputCls} ${settingsForm.formState.errors.nightIdealMinutes ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                    />
                    {settingsForm.formState.errors.nightIdealMinutes && (
                      <p className="text-xs text-red-500 mt-1 text-right">{settingsForm.formState.errors.nightIdealMinutes.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Wake window alert (min)</label>
                  <input
                    type="number" min="1" max="360"
                    {...settingsForm.register('wakeWindowMaxMinutes')}
                    className={`${inputCls} ${settingsForm.formState.errors.wakeWindowMaxMinutes ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {settingsForm.formState.errors.wakeWindowMaxMinutes ? (
                    <p className="text-xs text-red-500 mt-1 text-right">{settingsForm.formState.errors.wakeWindowMaxMinutes.message}</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Push notification sent after this many minutes awake</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {updateSettings.isPending ? 'Saving…' : 'Save targets'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.serviceWorker.ready.then((reg) => {
                      reg.showNotification('Test notification', {
                        body: 'If you see this, the SW and notification permission are working.',
                        icon: '/icons/icon-192.png',
                        tag: 'test',
                      })
                    }).catch((err) => console.error('[push] test notification failed:', err))
                  }}
                  className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400"
                >
                  Test notification
                </button>
              </form>
            )}
          </div>

          {/* Right column: stats + log list */}
          <div className="space-y-4 mt-4 md:mt-0">

            {/* Stats row */}
            {(totalSleepTodaySec > 0 || longestStretchSec > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total sleep today</p>
                  <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 tabular-nums leading-none">
                    {formatDuration(totalSleepTodaySec)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Goal: 14–17h</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Longest stretch</p>
                  <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 tabular-nums leading-none">
                    {longestStretchSec ? formatDuration(longestStretchSec) : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Log list with sleep bar visualization */}
            {completedLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Last {Math.min(completedLogs.length, 8)} sleep entries
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {completedLogs.slice(0, 8).map((log) => {
                    const dur = log.endedAt
                      ? Math.round(
                          (new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000,
                        )
                      : null
                    const logType = log.type as 'NAP' | 'NIGHT'
                    const idealSec = idealSecForType(logType)
                    const barPct = dur != null ? Math.min(100, Math.max(3, Math.round((dur / idealSec) * 100))) : 0
                    const barColor = dur != null ? sleepBarColor(dur, idealSec) : 'bg-gray-300'

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
                              className={`${inputCls} ${editForm.formState.errors.startedAt ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
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
                            type="text" placeholder="Notes (optional)"
                            {...editForm.register('notes')}
                            className={inputCls}
                          />
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={editMutation.isPending}
                              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-50"
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
                      <div key={log.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {log.type === 'NAP' ? 'Nap' : 'Night sleep'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1 tabular-nums">
                              {dur != null ? formatDuration(dur) : '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(log)}
                              className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-purple-400 dark:hover:text-purple-500 transition-colors"
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
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {formatTimeRange(log.startedAt, log.endedAt)}
                          </p>
                          <p className="text-[11px] text-gray-300 dark:text-gray-600">
                            {barPct >= 100 ? '✓ ideal' : `${barPct}% of ${logType === 'NAP' ? `${settings.napIdealMinutes}m` : `${settings.nightIdealMinutes}m`} goal`}
                          </p>
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
