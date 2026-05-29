import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'

import { FeelBetterSheet } from '../FeelBetterSheet'
import { useIllnessMutations } from '../useIllness'
import type { EpisodeDetail } from '../useIllness'

import { EpisodeTimeline } from './EpisodeTimeline'
import { SymptomsCard } from './SymptomsCard'
import { TemperatureCard } from './TemperatureCard'

type Props = {
  episode: EpisodeDetail
}

export function ActiveEpisodeDetail({ episode }: Props) {
  const { endEpisode } = useIllnessMutations()
  const [showFeelBetter, setShowFeelBetter] = useState(false)
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

        <button
          type="button"
          className="w-full py-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[14px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2"
          onClick={() => { window.alert('Report generation coming soon') }}
        >
          <FileText size={16} />
          Generate Doctor Handoff Report
        </button>
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
