import { Link } from 'react-router-dom'

import { useEpisodes } from '../useIllness'
import { formatDuration, toTitleCase, FEVER_F } from '../utils/formatters'

type Props = {
  currentId?: string
}

export function HistoryTab({ currentId }: Props) {
  const { data: episodes = [] } = useEpisodes()
  const resolved = episodes.filter((e) => e.endedAt !== null && e.id !== currentId)

  if (resolved.length === 0) {
    return <p className="text-[14px] text-gray-400 dark:text-gray-500 py-4 text-center">No past episodes</p>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {resolved.map((episode, i) => {
        const duration = episode.endedAt
          ? formatDuration(new Date(episode.endedAt).getTime() - new Date(episode.startedAt).getTime())
          : null
        const peakTemp = episode.temperatureLogs.length > 0
          ? Math.max(...episode.temperatureLogs.map((t) => t.tempF))
          : null
        const startDate = new Date(episode.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
        const endDate = episode.endedAt ? new Date(episode.endedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : null

        return (
          <Link
            key={episode.id}
            to={`/illness/${episode.id}`}
            className={`flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">🤒</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                {startDate}{endDate && endDate !== startDate ? `–${endDate}` : ''}
              </p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                {duration ?? 'Ongoing'}{' '}
                {episode.symptoms.length > 0 && `· ${episode.symptoms.map((s) => toTitleCase(s.label)).join(', ')}`}
              </p>
              {episode.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {episode.symptoms.map((s) => (
                    <span
                      key={s.id}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}
                    >
                      {toTitleCase(s.label)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              {peakTemp !== null ? (
                <>
                  <p
                    className="text-[13px] font-bold"
                    style={{ color: peakTemp >= FEVER_F ? '#f87171' : '#9ca3af' }}
                  >
                    {peakTemp.toFixed(1)}°F
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">peak temp</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-gray-400 dark:text-gray-500">—</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">no temp</p>
                </>
              )}
              <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-1.5">Report →</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
