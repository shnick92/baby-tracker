import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

import type { EpisodeDetail } from '../useIllness'
import { buildTimeline, CATEGORY_STYLES } from '../utils/buildTimeline'
import { formatTime } from '../utils/formatters'

type Props = {
  episode: EpisodeDetail
  title?: string
  subtitle?: string
}

export function EpisodeTimeline({ episode, title = 'Episode Timeline', subtitle }: Props) {
  const timeline = buildTimeline(episode)

  const dayGroups = timeline.reduce<Record<string, ReturnType<typeof buildTimeline>>>((acc, item) => {
    const day = new Date(item.time).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {})

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</p>
        <span className="text-[12px] text-gray-400 dark:text-gray-500">
          {subtitle ?? `${timeline.length} events`}
        </span>
      </div>
      {Object.entries(dayGroups).map(([day, items]) => (
        <div key={day}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 py-2">{day}</p>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {items.map((item) => {
              const style = CATEGORY_STYLES[item.category]
              return (
                <div key={item.id} className="flex items-start gap-3 py-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 mt-0.5"
                    style={{ background: style.dot }}
                  >
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-tight">{item.label}</p>
                    {item.sub && <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(item.time)}</span>
                    {item.editPath && (
                      <Link to={item.editPath} className="text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors">
                        <ChevronLeft size={12} className="rotate-180" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
