import { useState } from 'react'

import { useIllnessMutations } from '../useIllness'
import type { EpisodeDetail, SicknessEpisode } from '../useIllness'
import { formatDuration, formatDateTime } from '../utils/formatters'

type Props = {
  episode: EpisodeDetail | SicknessEpisode
}

export function EpisodeTimesCard({ episode }: Props) {
  const { updateEpisode } = useIllnessMutations()
  const [editing, setEditing] = useState(false)
  const [startedAt, setStartedAt] = useState(episode.startedAt.slice(0, 16))
  const [endedAt, setEndedAt] = useState(episode.endedAt ? episode.endedAt.slice(0, 16) : '')

  function handleSave() {
    updateEpisode.mutate(
      {
        episodeId: episode.id,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: endedAt ? new Date(endedAt).toISOString() : undefined,
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (!editing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Episode Window</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[12px] text-blue-600 dark:text-blue-400 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-500 dark:text-gray-400">Started</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDateTime(episode.startedAt)}</span>
          </div>
          {episode.endedAt && (
            <>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500 dark:text-gray-400">Resolved</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDateTime(episode.endedAt)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500 dark:text-gray-400">Duration</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDuration(new Date(episode.endedAt).getTime() - new Date(episode.startedAt).getTime())}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const startD = new Date(startedAt)
  const endD = endedAt ? new Date(endedAt) : null
  const invalid = endD !== null && startD >= endD

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-4 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Edit Episode Window</p>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-1">Episode started</p>
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="w-full text-[14px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </div>
        {episode.endedAt && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-1">Episode resolved</p>
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full text-[14px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2.5 outline-none focus:border-blue-400"
            />
          </div>
        )}
        {invalid && (
          <p className="text-[12px] text-red-500">⚠ Start time can't be after end time</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-[14px] font-semibold text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={invalid || updateEpisode.isPending}
          className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-[14px] font-semibold text-white disabled:opacity-40"
        >
          {updateEpisode.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
