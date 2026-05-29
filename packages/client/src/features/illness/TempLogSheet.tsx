import { useState } from 'react'
import { Thermometer } from 'lucide-react'
import { useSwipeDown } from '@hooks/useSwipeDown'
import { useIllnessMutations } from './useIllness'

const METHODS = [
  { key: 'FOREHEAD', label: 'Forehead' },
  { key: 'EAR', label: 'Ear' },
  { key: 'RECTAL', label: 'Rectal' },
  { key: 'AXILLARY', label: 'Armpit' },
  { key: 'ORAL', label: 'Oral' },
] as const

type Method = typeof METHODS[number]['key']

const FEVER_THRESHOLD_F = 100.4

type Props = {
  episodeId: string
  onClose: () => void
}

export function TempLogSheet({ episodeId, onClose }: Props) {
  const { logTemperature } = useIllnessMutations()
  const [unit, setUnit] = useState<'F' | 'C'>('F')
  const [rawValue, setRawValue] = useState('98.6')
  const [method, setMethod] = useState<Method>('EAR')
  const swipeRef = useSwipeDown(onClose)

  const numericF = (() => {
    const n = parseFloat(rawValue)
    if (isNaN(n)) return null
    return unit === 'F' ? n : (n * 9) / 5 + 32
  })()

  const isFever = numericF !== null && numericF >= FEVER_THRESHOLD_F
  const displayC = numericF !== null ? ((numericF - 32) * 5) / 9 : null

  function handleSave() {
    if (numericF === null) return
    logTemperature.mutate(
      { episodeId, tempF: numericF, method },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={swipeRef} className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-5">
        <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-1" />
        <div className="flex items-center gap-2">
          <Thermometer size={18} className="text-amber-500" />
          <p className="text-[17px] font-bold text-gray-900 dark:text-gray-100">Log Temperature</p>
        </div>

        {/* Input + unit toggle */}
        <div className="flex gap-3 items-center">
          <input
            type="number"
            step="0.1"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder={unit === 'F' ? '98.6' : '37.0'}
            className="flex-1 text-center text-[30px] font-light text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 py-3.5 outline-none focus:border-amber-400"
          />
          <div className="flex flex-col bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden p-1 gap-1">
            {(['F', 'C'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  if (u === unit) return
                  const n = parseFloat(rawValue)
                  if (!isNaN(n)) {
                    const converted = u === 'C' ? ((n - 32) * 5) / 9 : (n * 9) / 5 + 32
                    setRawValue(converted.toFixed(1))
                  }
                  setUnit(u)
                }}
                className="px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={
                  unit === u
                    ? { background: 'var(--surface2, #363645)', color: '#f0eee8' }
                    : { color: '#9ca3af' }
                }
              >
                °{u}
              </button>
            ))}
          </div>
        </div>

        {/* Fever callout */}
        {isFever && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5 text-[12px] text-red-600 dark:text-red-400 text-center font-medium">
            🔥 Above fever threshold (100.4°F / 38°C)
            {displayC !== null && ` · ${displayC.toFixed(1)}°C`}
          </div>
        )}
        {numericF !== null && !isFever && (
          <p className="text-center text-[12px] text-gray-400 dark:text-gray-500">
            {unit === 'C' && displayC !== null ? `= ${numericF.toFixed(1)}°F · ` : ''}Normal range
          </p>
        )}

        {/* Method selector */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5">
            How was it measured?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className="py-3 rounded-xl text-[13px] font-medium border transition-colors"
                style={
                  method === m.key
                    ? { background: 'rgba(126,184,232,0.12)', color: '#7eb8e8', borderColor: '#7eb8e8' }
                    : { background: 'transparent', color: '#9ca3af', borderColor: 'rgba(255,255,255,0.14)' }
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-[15px] font-semibold text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={numericF === null || logTemperature.isPending}
            className="flex-[2] py-3.5 rounded-xl text-[15px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-300/40 disabled:opacity-40"
            style={{ background: 'rgba(245,158,11,0.10)' }}
          >
            {logTemperature.isPending ? 'Saving…' : 'Save Reading'}
          </button>
        </div>
      </div>
    </div>
  )
}
