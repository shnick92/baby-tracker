import { useSwipeDown } from '@hooks/useSwipeDown'
import type { SicknessEpisode } from './useIllness'

function formatDuration(ms: number) {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

type Props = {
  episode: SicknessEpisode
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function FeelBetterSheet({ episode, onClose, onConfirm, isPending }: Props) {
  const duration = formatDuration(Date.now() - new Date(episode.startedAt).getTime())
  const swipeRef = useSwipeDown(onClose)

  const peakTemp = episode.temperatureLogs.length > 0
    ? Math.max(...episode.temperatureLogs.map((t) => t.tempF))
    : null

  const toC = (f: number) => ((f - 32) * 5 / 9).toFixed(1)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        ref={swipeRef}
        className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-1" />

        <div>
          <p className="text-[17px] font-bold text-gray-900 dark:text-gray-100">Is baby feeling better?</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            This will close the episode. All logs created after this will no longer be tagged to the illness. You can still view the episode history and generate a report.
          </p>
        </div>

        {/* Episode summary */}
        <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-100 dark:border-gray-600 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Episode summary</p>
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-500 dark:text-gray-400">Duration</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{duration}</span>
          </div>
          {peakTemp !== null && (
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500 dark:text-gray-400">Peak temp</span>
              <span className="font-semibold text-red-500 dark:text-red-400">
                {peakTemp.toFixed(1)}°F ({toC(peakTemp)}°C)
              </span>
            </div>
          )}
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-500 dark:text-gray-400">Symptoms</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{episode.symptoms.length}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-[15px] font-semibold text-gray-700 dark:text-gray-300"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-[2] py-3.5 rounded-xl text-[15px] font-semibold text-green-700 dark:text-green-300 border border-green-300/40 disabled:opacity-50"
            style={{ background: 'rgba(34,197,94,0.10)' }}
          >
            {isPending ? 'Saving…' : '🎉 Mark as Better'}
          </button>
        </div>
      </div>
    </div>
  )
}
