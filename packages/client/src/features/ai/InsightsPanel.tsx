import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react'
import { useInsights } from './useInsights'
import { useQueryClient } from '@tanstack/react-query'
import { aiKeys } from './queryKeys'

interface Props {
  babyId: string
}

function formatMinutes(min: number): string {
  if (min === 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function InsightsPanel({ babyId }: Props) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, isFetching } = useInsights(babyId)
  const queryClient = useQueryClient()

  function refresh() {
    queryClient.invalidateQueries({ queryKey: aiKeys.insights(babyId) })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-3 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          <Sparkles className="w-3 h-3" />
          AI Insights
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
          {isLoading || isFetching ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ) : isError || !data ? (
            <div className="text-sm text-gray-400 dark:text-gray-500">
              Not enough data yet — insights appear after a few days of tracking.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {data.summary}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wide font-semibold mb-0.5">Feed interval</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {formatMinutes(data.feedingInterval.avg7d)}
                  </p>
                  <p className="text-[10px] text-blue-400 dark:text-blue-500">7-day avg</p>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 px-3 py-2">
                  <p className="text-[10px] text-purple-500 dark:text-purple-400 uppercase tracking-wide font-semibold mb-0.5">Longest sleep</p>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {formatMinutes(data.sleepPattern.longestStretchMin)}
                  </p>
                  <p className="text-[10px] text-purple-400 dark:text-purple-500">this week</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
                  <p className="text-[10px] text-green-500 dark:text-green-400 uppercase tracking-wide font-semibold mb-0.5">Daily sleep</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    {formatMinutes(data.sleepPattern.avgDailySleepMin)}
                  </p>
                  <p className="text-[10px] text-green-400 dark:text-green-500">avg this week</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 uppercase tracking-wide font-semibold mb-0.5">Wake window</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {formatMinutes(data.sleepPattern.avgWakeWindowMin)}
                  </p>
                  <p className="text-[10px] text-amber-400 dark:text-amber-500">avg this week</p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={refresh}
                  className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh insights
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
