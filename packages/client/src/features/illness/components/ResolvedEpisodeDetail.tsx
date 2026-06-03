import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, FileText, ChevronDown } from 'lucide-react'

import { useIllnessMutations, useIllnessReport } from '../useIllness'
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
  const { downloadReport, isPending: reportPending } = useIllnessReport()
  const [showFormatPicker, setShowFormatPicker] = useState(false)
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

      <div className="relative">
        <div className="flex rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <button
            type="button"
            disabled={reportPending}
            className="flex-1 py-4 bg-white dark:bg-gray-800 text-[14px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={() => downloadReport(episode.id, 'pdf')}
          >
            <FileText size={16} />
            {reportPending ? 'Generating…' : 'Doctor Handoff Report'}
          </button>
          <button
            type="button"
            disabled={reportPending}
            aria-label="Choose report format"
            className="px-4 py-4 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 text-gray-400 disabled:opacity-50"
            onClick={() => setShowFormatPicker((v) => !v)}
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {showFormatPicker && (
          <div className="absolute bottom-full mb-1 right-0 w-44 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg z-10 overflow-hidden">
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => { setShowFormatPicker(false); downloadReport(episode.id, 'pdf') }}
            >
              PDF (formatted)
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
              onClick={() => { setShowFormatPicker(false); downloadReport(episode.id, 'text') }}
            >
              Plain text (copy-paste)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
