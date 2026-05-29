import { useState } from 'react'
import { Thermometer, X } from 'lucide-react'

import { TempLogSheet } from '../TempLogSheet'
import { useIllnessMutations } from '../useIllness'
import type { EpisodeDetail, SicknessEpisode } from '../useIllness'
import { FEVER_F, toC, METHOD_LABEL, formatTime } from '../utils/formatters'

import { TempSparkline } from './TempSparkline'

type Props = {
  episode: EpisodeDetail | SicknessEpisode
  canAdd: boolean
}

export function TemperatureCard({ episode, canAdd }: Props) {
  const { deleteTemperature } = useIllnessMutations()
  const [showLog, setShowLog] = useState(false)

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Temperature</p>
          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', borderColor: 'rgba(245,158,11,0.35)' }}
          >
            <Thermometer size={13} /> {canAdd ? 'Log Temp' : 'Add missed reading'}
          </button>
        </div>

        {episode.temperatureLogs.length === 0 ? (
          <p className="text-[13px] text-gray-400 dark:text-gray-500">No temperature readings yet</p>
        ) : (
          <>
            <TempSparkline readings={episode.temperatureLogs} />
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {episode.temperatureLogs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="text-[14px] font-bold w-14 flex-shrink-0"
                    style={{ color: t.tempF >= FEVER_F ? '#f87171' : '#7ec8a0' }}
                  >
                    {t.tempF.toFixed(1)}°F
                  </span>
                  <span className="flex-1 text-[12px] text-gray-500 dark:text-gray-400">
                    {toC(t.tempF)}°C · {METHOD_LABEL[t.method]} · {formatTime(t.recordedAt)}
                    {t.notes && ` · ${t.notes}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTemperature.mutate({ episodeId: episode.id, tempId: t.id })}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showLog && (
        <TempLogSheet episodeId={episode.id} onClose={() => setShowLog(false)} />
      )}
    </>
  )
}
