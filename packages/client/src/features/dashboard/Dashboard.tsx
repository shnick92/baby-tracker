import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { formatHeaderDate, greeting } from '@lib/utils/formatDate'
import { formatDuration, formatTimeAgo } from '@lib/utils'
import { api } from '@lib/axios'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { AddPasskeyButton } from '../auth/AddPasskeyButton'
import { PregnancyProgressWidget } from '../pregnancy'
import { usePregnancyStatus } from '../pregnancy'
import { useFeedingLogs } from '../feeding'
import { useSleepLogs } from '../sleep'
import { useDiaperLogs } from '../diaper'
import { SOSButton } from '../alerts'

const SOCKET_RING: Record<string, string> = {
  connecting: '0 0 0 2px #f59e0b',
  synced: '0 0 0 2px #22c55e',
  unsynced: '0 0 0 2px #ef4444',
}

const FEEDING_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Left breast',
  BREAST_RIGHT: 'Right breast',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

const FEEDING_ICON: Record<string, string> = {
  BREAST_LEFT: '👈',
  BREAST_RIGHT: '👉',
  BOTTLE: '🍼',
  PUMP: '🔄',
}

function WakeWindowCard({ lastSleep }: { lastSleep: { endedAt: string | null; startedAt: string; type: string } | null }) {
  const awakeElapsed = useElapsedSeconds(lastSleep?.endedAt ?? undefined)

  if (!lastSleep?.endedAt) return null

  const idealWindowSec = 90 * 60
  const pct = Math.min((awakeElapsed / idealWindowSec) * 100, 100)
  const approaching = awakeElapsed > idealWindowSec * 0.6

  return (
    <div className={`rounded-2xl border px-4 py-4 ${approaching ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${approaching ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
          Wake window
        </p>
        {approaching && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
            Nap window soon
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-3xl font-semibold tabular-nums ${approaching ? 'text-amber-800 dark:text-amber-300' : 'text-gray-800 dark:text-gray-100'}`}>
          {formatDuration(awakeElapsed)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          awake since {new Date(lastSleep.endedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${approaching ? 'bg-amber-400 dark:bg-amber-500' : 'bg-indigo-400 dark:bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Ideal nap window: ~90 min</p>
    </div>
  )
}

type AnyLog =
  | { _type: 'feed'; ts: string; label: string; icon: string; meta: string }
  | { _type: 'sleep'; ts: string; label: string; icon: string; meta: string }
  | { _type: 'diaper'; ts: string; label: string; icon: string; meta: string }

const DOT_COLOR: Record<string, string> = {
  feed: 'bg-blue-400',
  sleep: 'bg-indigo-400',
  diaper: 'bg-amber-400',
}

export function Dashboard() {
  const { user, babyId, markPasskeyAdded } = useAuthStore()
  const socketStatus = useSocketStore((s) => s.status)
  const queryClient = useQueryClient()
  const [showAddPasskey, setShowAddPasskey] = useState(false)
  const [confirmBorn, setConfirmBorn] = useState(false)

  const { data: pregnancyData } = usePregnancyStatus()
  const born = pregnancyData?.born ?? false

  const markBornMutation = useMutation({
    mutationFn: (reset?: boolean) =>
      api.patch('/api/pregnancy/born', { babyId, ...(reset && { reset: true }) }).then((r) => r.data),
    onSuccess: () => {
      setConfirmBorn(false)
      queryClient.invalidateQueries({ queryKey: ['pregnancy', 'status', babyId] })
    },
  })

  const { logs: feedingLogs, isLoading: feedingLoading, activeSession: activeFeeding, feedCountToday } = useFeedingLogs(babyId!)
  const { logs: sleepLogs, activeSession: activeSleep, lastEnded: lastSleep, isLoading: sleepLoading, totalSleepTodaySec } = useSleepLogs(babyId!)
  const { logs: diaperLogs, wetCount, dirtyCount, isLoading: diaperLoading } = useDiaperLogs(babyId!)

  const firstName = user?.name?.split(' ')[0] ?? ''
  const lastFed = feedingLogs.find((l) => l.endedAt || l.type === 'BOTTLE' || l.type === 'PUMP') ?? null
  const totalDiapers = wetCount + dirtyCount

  const recentActivity: AnyLog[] = []
  for (const log of feedingLogs.slice(0, 3)) {
    recentActivity.push({
      _type: 'feed',
      ts: log.endedAt ?? log.startedAt,
      label: FEEDING_LABEL[log.type],
      icon: FEEDING_ICON[log.type],
      meta: log.durationSec ? formatDuration(log.durationSec) : log.volumeOz ? `${log.volumeOz} oz` : '',
    })
  }
  for (const log of sleepLogs.filter((l) => l.endedAt).slice(0, 3)) {
    const dur = Math.round((new Date(log.endedAt!).getTime() - new Date(log.startedAt).getTime()) / 1000)
    recentActivity.push({
      _type: 'sleep',
      ts: log.endedAt!,
      label: log.type === 'NAP' ? 'Nap' : 'Night sleep',
      icon: log.type === 'NAP' ? '😴' : '🌙',
      meta: formatDuration(dur),
    })
  }
  for (const log of diaperLogs.slice(0, 3)) {
    recentActivity.push({
      _type: 'diaper',
      ts: log.occurredAt,
      label: log.type === 'WET' ? 'Wet diaper' : log.type === 'DIRTY' ? 'Dirty diaper' : 'Wet + Dirty',
      icon: log.type === 'WET' ? '💧' : '💩',
      meta: log.color ? log.color.charAt(0) + log.color.slice(1).toLowerCase() : '',
    })
  }
  recentActivity.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  const topActivity = recentActivity.slice(0, 5)

  const chevron = (
    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )

  const statsStrip = (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Feeds', value: feedCountToday, color: 'text-blue-500 dark:text-blue-400', loading: feedingLoading },
        { label: 'Diapers', value: totalDiapers, color: 'text-amber-500 dark:text-amber-400', loading: diaperLoading },
        { label: 'Sleep', value: totalSleepTodaySec > 0 ? formatDuration(totalSleepTodaySec) : '—', color: 'text-indigo-500 dark:text-indigo-400', loading: sleepLoading },
      ].map((item) => (
        <div key={item.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-3 py-3 text-center">
          {item.loading ? (
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          ) : (
            <p className={`text-2xl font-bold tabular-nums leading-tight ${item.color}`}>{item.value}</p>
          )}
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )

  const trackingLinks = (
    <div className="space-y-2">
      <Link to="/feeding" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:scale-[0.98] transition-all">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-xl flex-shrink-0">🍼</div>
        <div className="flex-1 min-w-0">
          {feedingLoading ? (
            <div className="space-y-1.5 animate-pulse"><div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
          ) : activeFeeding ? (
            <><p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Feeding now</p><p className="text-xs text-gray-400 dark:text-gray-500">{FEEDING_LABEL[activeFeeding.type]} · started {formatTimeAgo(activeFeeding.startedAt)}</p></>
          ) : lastFed ? (
            <><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Last fed {formatTimeAgo(lastFed.endedAt ?? lastFed.startedAt)}</p><p className="text-xs text-gray-400 dark:text-gray-500">{FEEDING_LABEL[lastFed.type]}</p></>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No feeds logged yet</p>
          )}
        </div>
        {chevron}
      </Link>
      <Link to="/sleep" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:scale-[0.98] transition-all">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-xl flex-shrink-0">😴</div>
        <div className="flex-1 min-w-0">
          {sleepLoading ? (
            <div className="space-y-1.5 animate-pulse"><div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
          ) : activeSleep ? (
            <><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{activeSleep.type === 'NAP' ? 'Napping' : 'Sleeping'}</p><p className="text-xs text-gray-400 dark:text-gray-500">Started {formatTimeAgo(activeSleep.startedAt)}</p></>
          ) : lastSleep?.endedAt ? (
            <><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Awake {formatDuration(Math.max(0, Math.floor((Date.now() - new Date(lastSleep.endedAt).getTime()) / 1000)))}</p><p className="text-xs text-gray-400 dark:text-gray-500">Last {lastSleep.type === 'NAP' ? 'nap' : 'sleep'} {formatTimeAgo(lastSleep.endedAt)}</p></>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No sleep logged yet</p>
          )}
        </div>
        {chevron}
      </Link>
      <Link to="/diaper" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:scale-[0.98] transition-all">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-xl flex-shrink-0">💧</div>
        <div className="flex-1 min-w-0">
          {diaperLoading ? (
            <div className="space-y-1.5 animate-pulse"><div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" /></div>
          ) : totalDiapers > 0 ? (
            <><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{totalDiapers} diaper{totalDiapers !== 1 ? 's' : ''} today</p><p className="text-xs text-gray-400 dark:text-gray-500">{wetCount} wet · {dirtyCount} dirty</p></>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No diapers logged today</p>
          )}
        </div>
        {chevron}
      </Link>
    </div>
  )

  const activityFeed = topActivity.length > 0 ? (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1 mb-2">
        Recent activity
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/60">
        {topActivity.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[item._type]}`} />
            <span className="text-sm flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {item.label}
                {item.meta && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {item.meta}</span>}
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTimeAgo(item.ts)}</p>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const bornLabel = born ? (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Baby Tracking</h2>
      <button type="button" onClick={() => markBornMutation.mutate(true)} disabled={markBornMutation.isPending}
        className="text-xs text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 disabled:opacity-40 transition-colors">
        not yet? undo
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Baby Tracking</h2>
      {confirmBorn ? (
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => markBornMutation.mutate(undefined)} disabled={markBornMutation.isPending}
            className="text-xs font-medium text-green-600 dark:text-green-400 disabled:opacity-40">
            {markBornMutation.isPending ? 'saving…' : 'confirm'}
          </button>
          <button type="button" onClick={() => setConfirmBorn(false)}
            className="text-xs text-gray-400 dark:text-gray-500">cancel</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmBorn(true)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          baby here?
        </button>
      )}
    </div>
  )

  const prepLinks = (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">Pregnancy Prep</p>
      {[
        { to: '/checklist/hospital_bag_mom', label: 'Hospital Bags', sub: "Mom's & Baby's packing lists", icon: '📋' },
        { to: '/checklist/home_prep', label: 'Home Prep', sub: 'Get ready before arrival', icon: '🏠' },
        { to: '/checklist/before_home', label: 'Before We Get Home', sub: 'Hospital discharge checklist', icon: '📋' },
        { to: '/purchases', label: 'Purchases', sub: 'Track what you still need', icon: '🛍️' },
        { to: '/visitors', label: 'Visitor Schedule', sub: 'Plan who comes and when', icon: '👥' },
      ].map((card) => (
        <Link key={card.to} to={card.to} className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-xl flex-shrink-0">{card.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{card.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
          </div>
          {chevron}
        </Link>
      ))}
    </div>
  )

  const passkeyCard = !user?.hasPasskey ? (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Security</h2>
      {showAddPasskey ? (
        <AddPasskeyButton deviceName={`${user?.name}'s device`} onSuccess={markPasskeyAdded} />
      ) : (
        <button type="button" onClick={() => setShowAddPasskey(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          Add a passkey (biometric login)
        </button>
      )}
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">{greeting(firstName)}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatHeaderDate()}</p>
        </div>
        {babyId && <SOSButton babyId={babyId} />}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold"
          style={{ boxShadow: SOCKET_RING[socketStatus] }}
        >
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      </header>

      {/* Mobile layout — pt-[76px] clears the fixed header with breathing room */}
      <main className="md:hidden max-w-lg mx-auto px-4 pt-[76px] pb-6 space-y-4">
        <PregnancyProgressWidget />

        {born ? (
          <>
            {bornLabel}
            {statsStrip}
            <WakeWindowCard lastSleep={lastSleep} />
            {trackingLinks}
            {activityFeed}
            {prepLinks}
          </>
        ) : (
          <>
            {prepLinks}
            {bornLabel}
            {trackingLinks}
          </>
        )}

        {passkeyCard}
      </main>

      {/* Tablet layout — 2-column */}
      <main className="hidden md:grid md:grid-cols-2 md:gap-6 md:px-6 md:py-6 md:items-start max-w-4xl">
        {/* Left column */}
        <div className="space-y-4">
          <PregnancyProgressWidget />

          {born ? (
            <>
              {bornLabel}
              {statsStrip}
              <WakeWindowCard lastSleep={lastSleep} />
              {trackingLinks}
            </>
          ) : (
            <>
              {prepLinks}
              {bornLabel}
              {trackingLinks}
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {born && activityFeed}
          {born && prepLinks}
          {!born && activityFeed}
          {passkeyCard}
        </div>
      </main>
    </div>
  )
}
