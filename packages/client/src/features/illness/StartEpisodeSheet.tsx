import { useState } from 'react'
import { SUGGESTED_SYMPTOMS } from '@tracker/shared'
import { useSwipeDown } from '@hooks/useSwipeDown'
import { useIllnessMutations } from './useIllness'

type Props = {
  onClose: () => void
  onStarted: (episodeId: string) => void
}

export function StartEpisodeSheet({ onClose, onStarted }: Props) {
  const { startEpisode } = useIllnessMutations()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const swipeRef = useSwipeDown(onClose)

  function toggle(label: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    setSelected((prev) => new Set([...prev, trimmed]))
    setCustomInput('')
    setShowCustom(false)
  }

  function handleStart() {
    startEpisode.mutate(
      { symptoms: [...selected] },
      { onSuccess: (episode) => { if (episode) onStarted(episode.id) } },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={swipeRef} className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-1 flex-shrink-0" />

        <div className="flex-shrink-0">
          <p className="text-[17px] font-bold text-gray-900 dark:text-gray-100">🤒 Start a sick episode</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            All logs will automatically attach to this episode until you mark baby as better.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            What symptoms does baby have?
          </p>
          <div className="flex flex-wrap gap-2">
            {[...SUGGESTED_SYMPTOMS].map((symptom) => {
              const active = selected.has(symptom)
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggle(symptom)}
                  className="text-[13px] font-medium px-3 py-1.5 rounded-full border transition-colors"
                  style={
                    active
                      ? { background: 'rgba(245,158,11,0.12)', color: '#d97706', borderColor: 'rgba(245,158,11,0.35)' }
                      : { background: 'transparent', borderColor: 'rgba(255,255,255,0.14)', color: '#9ca3af' }
                  }
                >
                  {symptom}
                </button>
              )
            })}
            {/* Extra selected custom symptoms */}
            {[...selected].filter((s) => !(SUGGESTED_SYMPTOMS as readonly string[]).includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="text-[13px] font-medium px-3 py-1.5 rounded-full border transition-colors"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderColor: 'rgba(245,158,11,0.35)' }}
              >
                {s} ✕
              </button>
            ))}
            {showCustom ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="e.g. Ear Tugging"
                  className="text-[13px] px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-500 bg-transparent text-gray-700 dark:text-gray-300 outline-none w-36"
                />
                <button type="button" onClick={addCustom} className="text-[12px] text-amber-500 font-medium">Add</button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="text-[13px] font-medium px-3 py-1.5 rounded-full border border-dashed text-gray-400 dark:text-gray-500"
                style={{ borderColor: 'rgba(156,163,175,0.4)' }}
              >
                + Other
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-[15px] font-semibold text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={startEpisode.isPending}
            className="flex-[2] py-3.5 rounded-xl text-[15px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-300/40 disabled:opacity-50"
            style={{ background: 'rgba(245,158,11,0.10)' }}
          >
            {startEpisode.isPending ? 'Starting…' : '🤒 Start Episode'}
          </button>
        </div>
      </div>
    </div>
  )
}
