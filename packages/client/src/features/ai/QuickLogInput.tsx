import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, Check, X, Moon, Droplets, Pill, HelpCircle, Thermometer } from 'lucide-react'
import { BabyBottleIcon } from '@components/icons'
import { parseLog, commitParsedLog, type ParsedLogResult } from './api'

interface Props {
  babyId: string
  onIllnessStarted?: (episodeId: string) => void
}

const LOG_TYPE_LABELS: Record<string, string> = {
  feeding_bottle: 'Bottle feed',
  feeding_breast: 'Breast feed',
  sleep: 'Sleep',
  diaper: 'Diaper',
  medication: 'Medication',
  tummy_time: 'Tummy time',
  temperature: 'Temperature logged',
  illness_start: 'Start illness episode',
  unknown: 'Unknown',
}

const LOG_TYPE_ICONS: Record<string, React.ReactNode> = {
  feeding_bottle: <BabyBottleIcon size={16} />,
  feeding_breast: <span className="text-sm leading-none">🤱</span>,
  sleep: <Moon size={16} />,
  diaper: <Droplets size={16} />,
  medication: <Pill size={16} />,
  tummy_time: <span className="text-sm leading-none">🐢</span>,
  temperature: <Thermometer size={16} className="text-red-500" />,
  illness_start: <Thermometer size={16} className="text-amber-500" />,
  unknown: <HelpCircle size={16} />,
}

function getLogLabel(parsed: ParsedLogResult): string {
  if (parsed.type === 'feeding_breast') {
    const side = parsed.data['side'] as string | undefined
    if (side === 'BREAST_LEFT') return 'Left breast'
    if (side === 'BREAST_RIGHT') return 'Right breast'
  }
  return LOG_TYPE_LABELS[parsed.type] ?? parsed.type
}

const INVALIDATE_KEYS: Record<string, string[]> = {
  feeding_bottle: ['feedings'],
  feeding_breast: ['feedings'],
  sleep: ['sleeps'],
  diaper: ['diapers'],
  medication: ['medications'],
  tummy_time: ['tummyTime'],
  temperature: ['illnessActive'],
  illness_start: ['illnessActive'],
}

export function QuickLogInput({ babyId, onIllnessStarted }: Props) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedLogResult | null>(null)
  const [committed, setCommitted] = useState(false)
  const queryClient = useQueryClient()

  const parseMutation = useMutation({
    mutationFn: () => parseLog(text.trim(), babyId),
    onSuccess: (result) => {
      setParsed(result)
      setCommitted(false)
    },
  })

  const commitMutation = useMutation({
    mutationFn: () => commitParsedLog(babyId, parsed!),
    onSuccess: ({ episodeId }) => {
      setCommitted(true)
      setText('')
      const keys = INVALIDATE_KEYS[parsed!.type] ?? []
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k, babyId] }))
      if (parsed!.type === 'illness_start' && episodeId) {
        onIllnessStarted?.(episodeId)
      }
      setTimeout(() => {
        setParsed(null)
        setCommitted(false)
      }, 2000)
    },
  })

  function handleCancel() {
    setParsed(null)
    setCommitted(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Quick log
      </p>

      {!parsed && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) parseMutation.mutate()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Fed 3oz bottle just now" or "Nap from 1–2pm"'
            maxLength={500}
            className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || parseMutation.isPending}
            className="flex-none flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500 text-white disabled:opacity-40 active:opacity-80 transition-opacity"
          >
            {parseMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </form>
      )}

      {parsed && !committed && (
        <div className="space-y-3">
          {parsed.type === 'unknown' ? (
            <p className="text-sm text-red-500 dark:text-red-400">
              Could not understand that log. Try being more specific.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 px-3 py-2">
                <span className="flex items-center justify-center w-4 h-4 mt-0.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                  {LOG_TYPE_ICONS[parsed.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {getLogLabel(parsed)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{parsed.summary}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Is this correct? {Math.round(parsed.confidence * 100)}% confident.
              </p>
            </>
          )}

          <div className="flex gap-2">
            {parsed.type !== 'unknown' && (
              <button
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 active:opacity-80 transition-opacity"
              >
                {commitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            )}
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium active:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4" />
              {parsed.type === 'unknown' ? 'Dismiss' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {committed && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4" />
          Logged successfully!
        </div>
      )}
    </div>
  )
}
