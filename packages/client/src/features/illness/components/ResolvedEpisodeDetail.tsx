import { useNavigate } from 'react-router-dom'
import { RotateCcw, FileText } from 'lucide-react'

import { useIllnessMutations } from '../useIllness'
import type { EpisodeDetail } from '../useIllness'
import { formatDuration } from '../utils/formatters'

import { EpisodeTimeline } from './EpisodeTimeline'
import { EpisodeTimesCard } from './EpisodeTimesCard'
import { SymptomsCard } from './SymptomsCard'
import { TemperatureCard } from './TemperatureCard'

type Props = {
  episode: EpisodeDetail
}

export function ResolvedEpisodeDetail({ episode }: Props) {
  const { reopenEpisode } = useIllnessMutations()
  const navigate = useNavigate()

  const duration = episode.endedAt
    ? formatDuration(new Date(episode.endedAt).getTime() - new Date(episode.startedAt).getTime())
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '0.5px solid rgba(34,197,94,0.3)' }}
          >
            ✓ Resolved
          </span>
          {duration && <span className="text-[12px] text-gray-500 dark:text-gray-400">{duration}</span>}
        </div>
        <button
          type="button"
          onClick={() => reopenEpisode.mutate(episode.id, { onSuccess: () => navigate(`/illness/${episode.id}`) })}
          disabled={reopenEpisode.isPending}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border disabled:opacity-40"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', borderColor: 'rgba(245,158,11,0.35)' }}
        >
          <RotateCcw size={12} /> Reopen
        </button>
      </div>

      <EpisodeTimesCard episode={episode} />

      <div className="md:flex md:gap-4 md:items-start">
        <div className="md:w-72 md:flex-shrink-0 space-y-3">
          <SymptomsCard episode={episode} />
          <TemperatureCard episode={episode} canAdd={false} />
        </div>
        <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0">
          <EpisodeTimeline episode={episode} title="Timeline" subtitle="tap → to edit" />
        </div>
      </div>

      <button
        type="button"
        className="w-full py-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[14px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2"
        onClick={() => window.alert('Report generation coming soon')}
      >
        <FileText size={16} />
        Generate Doctor Handoff Report
      </button>
    </div>
  )
}
