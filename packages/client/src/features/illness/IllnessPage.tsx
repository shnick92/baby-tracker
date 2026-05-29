import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

import { useTopbarActions } from '@components/AppLayout'
import { useEpisodeDetail, useActiveEpisode, useEpisodes } from './useIllness'
import { toTitleCase } from './utils/formatters'
import { StartEpisodeSheet } from './StartEpisodeSheet'
import { ActiveEpisodeDetail } from './components/ActiveEpisodeDetail'
import { ResolvedEpisodeDetail } from './components/ResolvedEpisodeDetail'
import { HistoryTab } from './components/HistoryTab'
import { formatDuration, formatDateTime } from './utils/formatters'

// ── Skeleton ───────────────────────────────────────────────────────────────

function IllnessPageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-700" />
      <div className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-700" />
      <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-700" />
      <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-700" />
    </div>
  )
}

// ── Landing page ───────────────────────────────────────────────────────────

export function IllnessLandingPage() {
  const { data: episode, isLoading } = useActiveEpisode()
  const { data: episodes = [] } = useEpisodes()
  const navigate = useNavigate()
  const [showStart, setShowStart] = useState(false)
  const setTopbarAction = useTopbarActions()

  useEffect(() => {
    if (!episode && !isLoading) {
      setTopbarAction(
        <button
          type="button"
          onClick={() => setShowStart(true)}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-lg text-amber-700 dark:text-amber-300 border border-amber-300/40"
          style={{ background: 'rgba(245,158,11,0.10)' }}
        >
          🤒 Start Episode
        </button>
      )
    } else {
      setTopbarAction(null)
    }
    return () => setTopbarAction(null)
  }, [episode, isLoading, setTopbarAction])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 h-14 flex items-center">
          <p className="text-[16px] font-bold text-gray-900 dark:text-gray-100">Illness</p>
        </header>
        <main className="max-w-2xl mx-auto px-4 pt-4">
          <IllnessPageSkeleton />
        </main>
      </div>
    )
  }

  const resolved = episodes.filter((e) => e.endedAt !== null)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 h-14 flex items-center justify-between">
        <div>
          <p className="text-[16px] font-bold text-gray-900 dark:text-gray-100">Illness</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Episode tracking</p>
        </div>
        {!episode && (
          <button
            type="button"
            onClick={() => setShowStart(true)}
            className="text-[13px] font-semibold px-4 py-2 rounded-xl text-amber-700 dark:text-amber-300 border border-amber-300/40"
            style={{ background: 'rgba(245,158,11,0.10)' }}
          >
            🤒 Start Episode
          </button>
        )}
      </header>
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {episode ? (
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border p-4 cursor-pointer active:opacity-80"
            style={{ borderColor: 'rgba(245,158,11,0.35)' }}
            onClick={() => navigate(`/illness/${episode.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}
              >
                Active episode
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {formatDuration(Date.now() - new Date(episode.startedAt).getTime())}
              </span>
            </div>
            <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Started {formatDateTime(episode.startedAt)}
            </p>
            {episode.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {episode.symptoms.map((s) => (
                  <span
                    key={s.id}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}
                  >
                    {toTitleCase(s.label)}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-3 font-medium">View episode →</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
            <p className="text-3xl mb-2">😊</p>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">No active illness episode</p>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-1">Tap "Start Episode" if baby becomes sick</p>
          </div>
        )}

        {resolved.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1">Past episodes</p>
            <HistoryTab currentId={episode?.id} />
          </>
        )}
      </main>

      {showStart && (
        <StartEpisodeSheet
          onClose={() => setShowStart(false)}
          onStarted={(id) => { setShowStart(false); navigate(`/illness/${id}`) }}
        />
      )}
    </div>
  )
}

// ── Detail page ────────────────────────────────────────────────────────────

export function IllnessPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'detail' | 'all'>('detail')

  const { data: episode, isLoading } = useEpisodeDetail(id)

  const isActive = episode?.endedAt === null
  const subtitleLabel = episode
    ? isActive
      ? `Active · ${formatDuration(Date.now() - new Date(episode.startedAt).getTime())}`
      : `${new Date(episode.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} · Resolved`
    : ''

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="text-gray-400 dark:text-gray-500 p-1">
            <ChevronLeft size={22} />
          </button>
          <div>
            <p className="text-[16px] font-bold text-gray-900 dark:text-gray-100 leading-tight">Sick Episode</p>
            {subtitleLabel && <p className="text-[11px] text-gray-400 dark:text-gray-500">{subtitleLabel}</p>}
          </div>
        </div>
        {isActive && (
          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706', border: '0.5px solid rgba(245,158,11,0.3)' }}
          >
            Active
          </span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 pb-8 space-y-3">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden p-1 gap-1 border border-gray-100 dark:border-gray-700">
          {(['detail', 'all'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={
                tab === t
                  ? { background: '#fff', color: '#1f2937', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                  : { color: '#9ca3af' }
              }
            >
              {t === 'detail' ? (isActive ? 'Current Episode' : 'Episode Details') : 'All Episodes'}
            </button>
          ))}
        </div>

        {tab === 'detail' ? (
          isLoading ? (
            <IllnessPageSkeleton />
          ) : episode ? (
            isActive ? <ActiveEpisodeDetail episode={episode} /> : <ResolvedEpisodeDetail episode={episode} />
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">Episode not found</p>
          )
        ) : (
          <HistoryTab />
        )}
      </main>
    </div>
  )
}
