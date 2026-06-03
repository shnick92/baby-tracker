import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronDown } from 'lucide-react'

import { FeelBetterSheet } from '../FeelBetterSheet'
import { useIllnessMutations, useIllnessReport } from '../useIllness'
import type { EpisodeDetail } from '../useIllness'

import { EpisodeTimeline } from './EpisodeTimeline'
import { SymptomsCard } from './SymptomsCard'
import { TemperatureCard } from './TemperatureCard'

type Props = {
  episode: EpisodeDetail
}

export function ActiveEpisodeDetail({ episode }: Props) {
  const { endEpisode } = useIllnessMutations()
  const { downloadReport, isPending: reportPending } = useIllnessReport()
  const [showFeelBetter, setShowFeelBetter] = useState(false)
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowFeelBetter(true)}
          className="w-full py-4 rounded-xl text-[15px] font-semibold text-green-700 dark:text-green-300 border border-green-300/40"
          style={{ background: 'rgba(34,197,94,0.08)' }}
        >
          ✓ Baby is feeling better
        </button>

        <div className="md:flex md:gap-4 md:items-start">
          <div className="md:w-72 md:flex-shrink-0 space-y-3">
            <SymptomsCard episode={episode} />
            <TemperatureCard episode={episode} canAdd={true} />
          </div>
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0">
            <EpisodeTimeline episode={episode} title="Episode Timeline" />
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

      {showFeelBetter && (
        <FeelBetterSheet
          episode={episode}
          onClose={() => setShowFeelBetter(false)}
          onConfirm={() => {
            endEpisode.mutate(episode.id, { onSuccess: () => navigate('/') })
            setShowFeelBetter(false)
          }}
          isPending={endEpisode.isPending}
        />
      )}
    </>
  )
}
