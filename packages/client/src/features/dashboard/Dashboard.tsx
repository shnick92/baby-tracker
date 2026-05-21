import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { formatHeaderDate, greeting } from '@lib/utils/formatDate'
import { formatDuration, formatTimeAgo } from '@lib/utils'
import { api } from '@lib/axios'
import { AddPasskeyButton } from '../auth/AddPasskeyButton'
import { PregnancyProgressWidget } from '../pregnancy'
import { usePregnancyStatus } from '../pregnancy'
import { useFeedingLogs } from '../feeding'
import { useSleepLogs } from '../sleep'
import { useDiaperLogs } from '../diaper'

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

  const { logs: feedingLogs, isLoading: feedingLoading, activeSession: activeFeeding } = useFeedingLogs(babyId!)
  const { activeSession: activeSleep, lastEnded: lastSleep, isLoading: sleepLoading } = useSleepLogs(babyId!)
  const { wetCount, dirtyCount, isLoading: diaperLoading } = useDiaperLogs(babyId!)

  const firstName = user?.name?.split(' ')[0] ?? ''
  const lastFed = feedingLogs.find((l) => l.endedAt || l.type === 'BOTTLE' || l.type === 'PUMP') ?? null
  const totalDiapers = wetCount + dirtyCount

  const awakeMs = lastSleep?.endedAt
    ? Date.now() - new Date(lastSleep.endedAt).getTime()
    : null

  const chevron = (
    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )

  const trackingSection = (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Baby Tracking
        </h2>
        {born && (
          <button
            type="button"
            onClick={() => markBornMutation.mutate(true)}
            disabled={markBornMutation.isPending}
            className="text-xs text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 disabled:opacity-40 transition-colors"
          >
            not yet? undo
          </button>
        )}
      </div>
      <Link to="/feeding" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all">
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
      <Link to="/sleep" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-xl flex-shrink-0">😴</div>
        <div className="flex-1 min-w-0">
          {sleepLoading ? (
            <div className="space-y-1.5 animate-pulse"><div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
          ) : activeSleep ? (
            <><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{activeSleep.type === 'NAP' ? 'Napping' : 'Sleeping'}</p><p className="text-xs text-gray-400 dark:text-gray-500">Started {formatTimeAgo(activeSleep.startedAt)}</p></>
          ) : awakeMs != null ? (
            <><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Awake {formatDuration(Math.floor(awakeMs / 1000))}</p><p className="text-xs text-gray-400 dark:text-gray-500">Last {lastSleep?.type === 'NAP' ? 'nap' : 'sleep'} {lastSleep?.endedAt ? formatTimeAgo(lastSleep.endedAt) : ''}</p></>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No sleep logged yet</p>
          )}
        </div>
        {chevron}
      </Link>
      <Link to="/diaper" className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all">
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

  const prepSection = (
    <div>
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Pregnancy Prep
        </h2>
        {!born && (
          confirmBorn ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markBornMutation.mutate(undefined)}
                disabled={markBornMutation.isPending}
                className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-40 transition-colors"
              >
                {markBornMutation.isPending ? 'saving…' : 'confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBorn(false)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmBorn(true)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              baby here?
            </button>
          )
        )}
      </div>
      <div className="space-y-2">
        {[
          { to: '/checklist/hospital_bag_mom', label: 'Hospital Bags', sub: "Mom's & Baby's packing lists", icon: '📋' },
          { to: '/checklist/home_prep', label: 'Home Prep', sub: 'Get ready before arrival', icon: '🏠' },
          { to: '/checklist/before_home', label: 'Before We Get Home', sub: 'Hospital discharge checklist', icon: '📋' },
          { to: '/purchases', label: 'Purchases', sub: 'Track what you still need', icon: '🛍️' },
          { to: '/visitors', label: 'Visitor Schedule', sub: 'Plan who comes and when', icon: '👥' },
        ].map((card) => (
          <Link key={card.to} to={card.to} className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-xl flex-shrink-0">{card.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{card.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
            </div>
            {chevron}
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {greeting(firstName)}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatHeaderDate()}</p>
        </div>
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold"
          style={{ boxShadow: SOCKET_RING[socketStatus] }}
        >
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 md:max-w-2xl md:px-8">
        <PregnancyProgressWidget />

        {born ? (
          <>
            {trackingSection}
            {prepSection}
          </>
        ) : (
          <>
            {prepSection}
            {trackingSection}
          </>
        )}

        {!user?.hasPasskey && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Security</h2>
            {showAddPasskey ? (
              <AddPasskeyButton deviceName={`${user?.name}'s device`} onSuccess={markPasskeyAdded} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPasskey(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Add a passkey (biometric login)
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
