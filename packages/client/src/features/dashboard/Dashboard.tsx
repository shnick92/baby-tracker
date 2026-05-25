import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Droplets, MoreHorizontal } from 'lucide-react'

import { BabyBottleIcon } from '@components/icons'
import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { formatTimeAgo, formatDuration } from '@lib/utils'
import { api } from '@lib/axios'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { AddPasskeyButton } from '../auth/AddPasskeyButton'
import { PregnancyProgressWidget } from '../pregnancy'
import { usePregnancyStatus } from '../pregnancy'
import { useFeedingLogs } from '../feeding'
import { useSleepLogs } from '../sleep'
import { useDiaperLogs } from '../diaper'
import { useChecklist } from '../checklist'
import { usePurchases } from '../purchases'
import { useVisitors } from '../visitors'
import { SOSButton } from '../alerts'

const SOCKET_RING: Record<string, string> = {
  connecting: '0 0 0 2px #f59e0b',
  synced: '0 0 0 2px #22c55e',
  unsynced: '0 0 0 2px #ef4444',
}

const FEEDING_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Breast · Left',
  BREAST_RIGHT: 'Breast · Right',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PrepCard({
  label,
  checked,
  total,
  color,
  isLoading,
}: {
  label: string
  checked: number
  total: number
  color: string
  isLoading: boolean
}) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{label}</p>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {checked}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">/{total}</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{pct}% done</p>
        </>
      )}
    </div>
  )
}

function LastFeedingCard({
  lastFed,
  activeFeeding,
  currentUserId,
  isLoading,
}: {
  lastFed: { type: string; startedAt: string; endedAt: string | null; durationSec: number | null; volumeOz: number | null; loggedById: string } | null
  activeFeeding: { type: string; startedAt: string } | null
  currentUserId: string | undefined
  isLoading: boolean
}) {
  const activeElapsed = useElapsedSeconds(activeFeeding?.startedAt)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
          <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="h-10 w-40 bg-gray-100 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      </div>
    )
  }

  if (activeFeeding) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Feeding Now</p>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
            {FEEDING_LABEL[activeFeeding.type]}
          </span>
        </div>
        <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
          {formatDuration(activeElapsed)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Started {formatTimeAgo(activeFeeding.startedAt)}
        </p>
      </div>
    )
  }

  if (!lastFed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Last Feeding</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">No feedings logged yet</p>
      </div>
    )
  }

  const fedAt = lastFed.endedAt ?? lastFed.startedAt
  const secAgo = Math.max(0, Math.floor((Date.now() - new Date(fedAt).getTime()) / 1000))
  const nextSuggestedSec = 2 * 3600 - secAgo
  const loggedByMe = lastFed.loggedById === currentUserId
  const loggedByLabel = loggedByMe ? 'You' : 'Partner'
  const timeLabel = new Date(fedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Last Feeding</p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {FEEDING_LABEL[lastFed.type]}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
            {formatTimeAgo(fedAt)}
          </p>
          {nextSuggestedSec > 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Next suggested{' '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                in {formatDuration(nextSuggestedSec)}
              </span>
            </p>
          ) : (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 font-medium">Feeding time</p>
          )}
        </div>
        {lastFed.durationSec && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Duration</p>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{formatDuration(lastFed.durationSec)}</p>
          </div>
        )}
        {lastFed.volumeOz && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Volume</p>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{lastFed.volumeOz} oz</p>
          </div>
        )}
      </div>

      <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">Logged by</p>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {loggedByLabel} · {timeLabel}
        </p>
      </div>
    </div>
  )
}

function SleepCard({
  activeSleep,
  lastSleep,
  isLoading,
}: {
  activeSleep: { type: string; startedAt: string } | null
  lastSleep: { type: string; startedAt: string; endedAt: string | null } | null
  isLoading: boolean
}) {
  const awakeElapsed = useElapsedSeconds(
    !activeSleep && lastSleep?.endedAt ? lastSleep.endedAt : undefined,
  )
  const activeElapsed = useElapsedSeconds(activeSleep?.startedAt)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2 animate-pulse">
        <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
        <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 rounded-full" />
        <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
        <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  if (activeSleep) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-4 flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Sleep Status</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 w-fit">
          <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
          {activeSleep.type === 'NAP' ? 'Napping' : 'Sleeping'}
        </span>
        <p className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
          {formatDuration(activeElapsed)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Started {formatTimeAgo(activeSleep.startedAt)}
        </p>
      </div>
    )
  }

  const lastDuration =
    lastSleep?.endedAt && lastSleep.startedAt
      ? Math.round((new Date(lastSleep.endedAt).getTime() - new Date(lastSleep.startedAt).getTime()) / 1000)
      : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Sleep Status</p>
      {lastSleep?.endedAt ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 w-fit">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Awake
          </span>
          <p className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
            {formatDuration(awakeElapsed)}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> awake</span>
          </p>
          {lastDuration && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last {lastSleep.type === 'NAP' ? 'nap' : 'sleep'}: {formatDuration(lastDuration)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">No sleep logged yet</p>
      )}
    </div>
  )
}

function DiapersCard({
  wetCount,
  dirtyCount,
  todayLogs,
  isLoading,
}: {
  wetCount: number
  dirtyCount: number
  todayLogs: Array<{ occurredAt: string; type: string }>
  isLoading: boolean
}) {
  const lastDiaper = todayLogs.length > 0 ? todayLogs[0] : null

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2 animate-pulse">
        <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
        <div className="h-8 w-28 bg-gray-100 dark:bg-gray-700 rounded" />
        <div className="h-3 w-36 bg-gray-100 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Diapers Today</p>
        {(wetCount + dirtyCount) > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            {wetCount + dirtyCount} total
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-[26px] font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">{wetCount}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">wet</p>
        </div>
        <p className="text-gray-300 dark:text-gray-600 text-lg mb-1">+</p>
        <div>
          <p className="text-[26px] font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">{dirtyCount}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">dirty</p>
        </div>
      </div>
      {lastDiaper ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last: {lastDiaper.type === 'WET' ? 'wet' : lastDiaper.type === 'DIRTY' ? 'dirty' : 'wet+dirty'},{' '}
          {formatTimeAgo(lastDiaper.occurredAt)}
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">No diapers logged today</p>
      )}
    </div>
  )
}

function QuickLogRow() {
  const items: { to: string; label: string; bg: string; icon: React.ReactNode; color: string }[] = [
    { to: '/feeding', label: 'Feed', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <BabyBottleIcon size={20} />, color: 'text-blue-600 dark:text-blue-400' },
    { to: '/sleep', label: 'Sleep', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: <Moon size={20} />, color: 'text-indigo-600 dark:text-indigo-400' },
    { to: '/diaper', label: 'Diaper', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Droplets size={20} />, color: 'text-amber-600 dark:text-amber-400' },
    { to: '/more', label: 'More', bg: 'bg-gray-50 dark:bg-gray-700/50', icon: <MoreHorizontal size={20} />, color: 'text-gray-500 dark:text-gray-400' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`${item.bg} rounded-xl py-3 px-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
        >
          <span className={item.color}>{item.icon}</span>
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
        </Link>
      ))}
    </div>
  )
}

function VisitorsCard() {
  const { slots, isLoading } = useVisitors()
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = slots
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  if (isLoading) return null
  if (upcoming.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Visitors</p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          {upcoming.length} upcoming
        </span>
      </div>
      <div className="space-y-2">
        {upcoming.map((slot) => {
          const [sy, sm, sd] = slot.date.split('-').map(Number)
          const dateLabel = new Date(sy, sm - 1, sd).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          return (
            <div
              key={slot.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{slot.name}</p>
                {slot.notes && <p className="text-xs text-gray-400 dark:text-gray-500">{slot.notes}</p>}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                {dateLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Prep stats grid (pregnancy mode) ────────────────────────────────────────

function PrepStatsGrid() {
  const { data: momBag, isLoading: momLoading } = useChecklist('HOSPITAL_BAG_MOM')
  const { data: babyBag, isLoading: babyLoading } = useChecklist('HOSPITAL_BAG_BABY')
  const { data: homePrepData, isLoading: prepLoading } = useChecklist('HOME_PREP')
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases()

  const momItems = momBag?.items ?? []
  const babyItems = babyBag?.items ?? []
  const bagItems = [...momItems, ...babyItems]
  const bagChecked = bagItems.filter((i) => i.isChecked).length

  const prepItems = homePrepData?.items ?? []
  const prepChecked = prepItems.filter((i) => i.isChecked).length

  const purchasesTotal = purchasesData?.meta?.total ?? 0
  const purchasesBought = purchasesData?.meta?.bought ?? 0

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <PrepCard
        label="Hospital Bag"
        checked={bagChecked}
        total={bagItems.length}
        color="bg-blue-500 dark:bg-blue-400"
        isLoading={momLoading || babyLoading}
      />
      <PrepCard
        label="Purchases"
        checked={purchasesBought}
        total={purchasesTotal}
        color="bg-purple-500 dark:bg-purple-400"
        isLoading={purchasesLoading}
      />
      <PrepCard
        label="Home Prep"
        checked={prepChecked}
        total={prepItems.length}
        color="bg-green-500 dark:bg-green-400"
        isLoading={prepLoading}
      />
      <Link
        to="/visitors"
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-3 flex flex-col gap-1 active:scale-95 transition-transform"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Visitors</p>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Schedule</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Plan visits →</p>
      </Link>
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────

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
  const { wetCount, dirtyCount, todayLogs: diaperTodayLogs, isLoading: diaperLoading } = useDiaperLogs(babyId!)

  const lastFed = feedingLogs.find((l) => l.endedAt || l.type === 'BOTTLE' || l.type === 'PUMP') ?? null

  const passkeyCard = !user?.hasPasskey ? (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Set up biometric login</h2>
      {showAddPasskey ? (
        <AddPasskeyButton deviceName={`${user?.name}'s device`} onSuccess={markPasskeyAdded} />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddPasskey(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Add a passkey (faster login)
        </button>
      )}
    </div>
  ) : null

  const bornToggle = born ? (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Baby Tracking</p>
      <button
        type="button"
        onClick={() => markBornMutation.mutate(true)}
        disabled={markBornMutation.isPending}
        className="text-xs text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 disabled:opacity-40 transition-colors"
      >
        not yet? undo
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Baby Tracking</p>
      {confirmBorn ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markBornMutation.mutate(undefined)}
            disabled={markBornMutation.isPending}
            className="text-xs font-medium text-green-600 dark:text-green-400 disabled:opacity-40"
          >
            {markBornMutation.isPending ? 'saving…' : 'confirm'}
          </button>
          <button type="button" onClick={() => setConfirmBorn(false)} className="text-xs text-gray-400 dark:text-gray-500">
            cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmBorn(true)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          baby here?
        </button>
      )}
    </div>
  )

  // ── Mobile content ─────────────────────────────────────────────────────

  const mobileNewborn = (
    <div className="space-y-3">
      <LastFeedingCard
        lastFed={lastFed}
        activeFeeding={activeFeeding}
        currentUserId={user?.id}
        isLoading={feedingLoading}
      />
      <div className="grid grid-cols-2 gap-3">
        <SleepCard activeSleep={activeSleep} lastSleep={lastSleep} isLoading={sleepLoading} />
        <DiapersCard
          wetCount={wetCount}
          dirtyCount={dirtyCount}
          todayLogs={diaperTodayLogs}
          isLoading={diaperLoading}
        />
      </div>
      <QuickLogRow />
      {born && <VisitorsCard />}
    </div>
  )

  const mobilePregnancy = (
    <div className="space-y-3">
      <PregnancyProgressWidget />
      <PrepStatsGrid />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <span className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          {babyId && born && <SOSButton babyId={babyId} />}
          <div
            className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300"
            style={{ boxShadow: SOCKET_RING[socketStatus] }}
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      </header>

      {/* Mobile layout */}
      <main className="md:hidden max-w-lg mx-auto px-4 pt-4 pb-6 space-y-3">
        {born ? (
          <>
            {mobileNewborn}
            {bornToggle}
            {passkeyCard}
          </>
        ) : (
          <>
            {mobilePregnancy}
            {bornToggle}
            <div className="space-y-2">
              {[
                { to: '/feeding', label: 'Feeding', sub: 'Bottle & breast tracking', icon: <BabyBottleIcon size={20} />, color: 'text-blue-500 dark:text-blue-400' },
                { to: '/sleep', label: 'Sleep', sub: 'Nap & overnight tracking', icon: <Moon size={20} />, color: 'text-indigo-500 dark:text-indigo-400' },
                { to: '/diaper', label: 'Diapers', sub: 'Log wet & dirty', icon: <Droplets size={20} />, color: 'text-amber-500 dark:text-amber-400' },
              ].map((card) => (
                <Link
                  key={card.to}
                  to={card.to}
                  className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 active:scale-[0.98] transition-transform"
                >
                  <span className={card.color}>{card.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{card.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{card.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
            {passkeyCard}
          </>
        )}
      </main>

      {/* Tablet layout — 2-column grid */}
      <main className="hidden md:grid md:grid-cols-2 md:gap-5 md:px-6 md:py-6 md:items-start max-w-5xl mx-auto">
        {born ? (
          <>
            {/* Left column */}
            <div className="space-y-4">
              <LastFeedingCard
                lastFed={lastFed}
                activeFeeding={activeFeeding}
                currentUserId={user?.id}
                isLoading={feedingLoading}
              />
              <div className="grid grid-cols-2 gap-3">
                <SleepCard activeSleep={activeSleep} lastSleep={lastSleep} isLoading={sleepLoading} />
                <DiapersCard
                  wetCount={wetCount}
                  dirtyCount={dirtyCount}
                  todayLogs={diaperTodayLogs}
                  isLoading={diaperLoading}
                />
              </div>
              <QuickLogRow />
            </div>
            {/* Right column */}
            <div className="space-y-4">
              {born && <VisitorsCard />}
              {bornToggle}
              {passkeyCard}
            </div>
          </>
        ) : (
          <>
            {/* Left column */}
            <div className="space-y-4">
              <PregnancyProgressWidget />
              <PrepStatsGrid />
            </div>
            {/* Right column */}
            <div className="space-y-4">
              {bornToggle}
              {passkeyCard}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
