import { useAuthStore } from '@stores/authStore'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { TrashIcon } from '@components/icons'

import { useContractionLogs } from './useContractionLogs'
import { ContractionsSkeleton } from './ContractionsSkeleton'

function fmtTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtSec(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export function ContractionsPage() {
  const { babyId } = useAuthStore()
  const {
    logs, isLoading, activeSession, completedLogs, lastCompleted,
    startMutation, endMutation, deleteMutation,
  } = useContractionLogs(babyId!)

  const elapsed = useElapsedSeconds(activeSession?.startedAt)
  const sinceLast = useElapsedSeconds(!activeSession ? (lastCompleted?.startedAt ?? undefined) : undefined)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Contraction Timer</h1>
        {completedLogs.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {completedLogs.length} logged
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <ContractionsSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-3xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Timer controls */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">

            {activeSession ? (
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-200 dark:border-rose-800/50 px-4 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                    Contraction
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-medium">
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
                    className="flex-1 py-3.5 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.97]"
                  >
                    Stop
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="w-full py-5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-base font-semibold disabled:opacity-50 transition-all active:scale-[0.97] shadow-sm shadow-rose-200 dark:shadow-none flex items-center justify-center gap-3"
              >
                <span className="text-2xl">⏱️</span>
                <span>Start Contraction</span>
              </button>
            )}

            {/* Time since last contraction */}
            {!activeSession && lastCompleted && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Time since last contraction</p>
                <p className="text-2xl font-semibold text-rose-500 tabular-nums leading-none">
                  {fmtTimer(sinceLast)}
                </p>
              </div>
            )}
          </div>

          {/* Log list */}
          <div className="mt-4 md:mt-0">
            {completedLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Recent contractions
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {completedLogs.map((log, i) => {
                    const previous = completedLogs[i + 1]
                    const gapSec = previous
                      ? Math.round(
                          (new Date(log.startedAt).getTime() - new Date(previous.startedAt).getTime()) / 1000,
                        )
                      : null

                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-base flex-shrink-0">
                          ⏱️
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                            {fmtSec(log.durationSec ?? 0)}
                            {gapSec != null && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                                {' '}· {fmtSec(gapSec)} apart
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {fmtTime(log.startedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {logs.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
                No contractions logged yet
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
