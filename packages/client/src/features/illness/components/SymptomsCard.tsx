import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { SUGGESTED_SYMPTOMS } from '@tracker/shared'

import { useIllnessMutations } from '../useIllness'
import type { EpisodeDetail, SicknessEpisode } from '../useIllness'
import { toTitleCase } from '../utils/formatters'

type Props = {
  episode: EpisodeDetail | SicknessEpisode
}

export function SymptomsCard({ episode }: Props) {
  const { addSymptom, removeSymptom } = useIllnessMutations()
  const [showAdd, setShowAdd] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const existing = new Set(episode.symptoms.map((s) => s.label.toLowerCase()))

  function handleAdd(label: string) {
    addSymptom.mutate({ episodeId: episode.id, label }, { onSuccess: () => { setShowAdd(false); setCustomInput('') } })
  }

  const suggestions = SUGGESTED_SYMPTOMS.filter((s) => !existing.has(s.toLowerCase()))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Symptoms</p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[12px] text-blue-600 dark:text-blue-400 font-medium"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {episode.symptoms.length === 0 && !showAdd && (
        <p className="text-[13px] text-gray-400 dark:text-gray-500">No symptoms recorded yet</p>
      )}

      <div className="flex flex-wrap gap-2">
        {episode.symptoms.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '0.5px solid rgba(245,158,11,0.3)' }}
          >
            {toTitleCase(s.label)}
            <button
              type="button"
              onClick={() => removeSymptom.mutate({ episodeId: episode.id, symptomId: s.id })}
              className="opacity-60 hover:opacity-100"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {showAdd && (
        <div className="mt-3 space-y-3">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAdd(s)}
                  className="text-[12px] px-3 py-1 rounded-full border text-gray-500 dark:text-gray-400"
                  style={{ borderColor: 'rgba(156,163,175,0.3)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              autoFocus
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && customInput.trim() && handleAdd(customInput.trim())}
              placeholder="Other symptom…"
              className="flex-1 text-[13px] bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => customInput.trim() && handleAdd(customInput.trim())}
              className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[13px] font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-[13px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
