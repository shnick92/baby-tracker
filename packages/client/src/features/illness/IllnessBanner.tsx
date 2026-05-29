import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Thermometer } from 'lucide-react'
import { useActiveEpisode, useIllnessMutations } from './useIllness'
import { FeelBetterSheet } from './FeelBetterSheet'
import { toTitleCase } from './utils/formatters'

function formatDuration(ms: number) {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function IllnessBanner() {
  const { data: episode } = useActiveEpisode()
  const { endEpisode } = useIllnessMutations()
  const navigate = useNavigate()
  const [showFeelBetter, setShowFeelBetter] = useState(false)

  if (!episode) return null

  const duration = formatDuration(Date.now() - new Date(episode.startedAt).getTime())
  const startLabel = new Date(episode.startedAt).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <>
      <div
        className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer bg-amber-50 dark:bg-gray-900"
        style={{ borderColor: 'rgba(245,158,11,0.35)' }}
        onClick={() => navigate(`/illness/${episode.id}`)}
      >
        <Thermometer size={18} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
            Baby is sick · since {startLabel}
          </p>
          <p className="text-[11px] text-amber-500/70 dark:text-amber-400/60 mt-0.5">
            {duration} · Tap to view episode
          </p>
          {episode.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {episode.symptoms.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(245,158,11,0.14)',
                    color: '#d97706',
                    border: '0.5px solid rgba(245,158,11,0.3)',
                  }}
                >
                  {toTitleCase(s.label)}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowFeelBetter(true)
          }}
          className="flex-shrink-0 text-[12px] font-bold text-green-600 dark:text-green-400 border border-green-400/40 rounded-full px-3 py-1.5 bg-green-50 dark:bg-green-900/20 active:opacity-70 transition-opacity mt-0.5"
        >
          Feel Better ✓
        </button>
      </div>

      {showFeelBetter && (
        <FeelBetterSheet
          episode={episode}
          onClose={() => setShowFeelBetter(false)}
          onConfirm={() => {
            endEpisode.mutate(episode.id)
            setShowFeelBetter(false)
          }}
          isPending={endEpisode.isPending}
        />
      )}
    </>
  )
}
