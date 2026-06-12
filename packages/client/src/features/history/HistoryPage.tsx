import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

import { useAuthStore } from '@stores/authStore'
import { ExportContent } from '@features/settings'

import { useDailyHistory, useWeeklyHistory } from './useHistory'
import { HistorySkeleton } from './HistorySkeleton'

type Tab = 'daily' | 'weekly' | 'export'

function formatSec(sec: number): string {
  if (sec === 0) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function toLocalDateValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const FEEDING_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Breastfeed · Left',
  BREAST_RIGHT: 'Breastfeed · Right',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

const DIAPER_LABEL: Record<string, string> = { WET: 'Wet', DIRTY: 'Dirty', BOTH: 'Both' }
const MOOD_LABEL: Record<string, string> = {
  HAPPY: '😄 Happy', FUSSY: '😤 Fussy', CRYING: '😢 Crying',
  SLEEPING: '😴 Sleeping', ALERT: '👁 Alert', BATH: '🛁 Bath', WALK: '🚶 Walk',
}

type StatCardProps = { label: string; value: string; sub?: string }
function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function DailyView({ babyId, date }: { babyId: string; date: string }) {
  const { data, isLoading } = useDailyHistory(babyId, date)

  if (isLoading) return <HistorySkeleton />

  if (!data) return null

  const { feedings, sleeps, diapers, medications, tummyTimes, moods } = data

  type EventItem = { time: string; label: string; sub?: string; color: string }
  const events: EventItem[] = []

  for (const f of feedings) {
    const ts = f.endedAt ?? f.startedAt
    let label = FEEDING_LABEL[f.type] ?? f.type
    if (f.type === 'BOTTLE') {
      label = f.formulaName || (f.milkType === 'FORMULA' ? 'Formula' : 'Breast Milk')
    }
    const subs: string[] = []
    if (f.volumeOz != null) subs.push(`${f.volumeOz} oz`)
    if (f.durationSec != null) subs.push(formatSec(f.durationSec))
    events.push({ time: ts, label: `🍼 ${label}`, sub: subs.join(' · '), color: 'blue' })
  }
  for (const s of sleeps) {
    const dur = s.endedAt
      ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
      : null
    events.push({
      time: s.startedAt,
      label: `😴 ${s.type === 'NAP' ? 'Nap' : 'Night Sleep'}`,
      sub: dur != null ? formatSec(dur) : 'In progress',
      color: 'indigo',
    })
  }
  for (const d of diapers) {
    events.push({ time: d.occurredAt, label: `💧 Diaper · ${DIAPER_LABEL[d.type] ?? d.type}`, color: 'amber' })
  }
  for (const m of medications) {
    events.push({ time: m.givenAt, label: `💊 ${m.name}`, sub: m.dosageNote ?? undefined, color: 'green' })
  }
  for (const t of tummyTimes) {
    events.push({
      time: t.startedAt,
      label: `🐢 Tummy Time`,
      sub: t.durationSec != null ? formatSec(t.durationSec) : undefined,
      color: 'teal',
    })
  }
  for (const m of moods) {
    const label = m.customActivity
      ? `${m.customActivity.emoji} ${m.customActivity.name}`
      : MOOD_LABEL[m.mood ?? ''] ?? m.mood ?? 'Mood'
    events.push({ time: m.occurredAt, label, color: 'purple' })
  }

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  const DOT_COLOR: Record<string, string> = {
    blue: 'bg-blue-400',
    indigo: 'bg-indigo-400',
    amber: 'bg-amber-400',
    green: 'bg-green-400',
    teal: 'bg-teal-400',
    purple: 'bg-purple-400',
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm font-medium">No logs for this day</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{feedings.length}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Feeds</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{diapers.length}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Diapers</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatSec(
              sleeps
                .filter((s) => s.endedAt)
                .reduce(
                  (sum, s) =>
                    sum + Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 1000),
                  0,
                ),
            )}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Sleep</p>
        </div>
      </div>

      {/* Timeline */}
      {events.map((ev, i) => (
        <div key={i} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLOR[ev.color] ?? 'bg-gray-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{ev.label}</p>
            {ev.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ev.sub}</p>}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{formatTime(ev.time)}</span>
        </div>
      ))}
    </div>
  )
}

function WeeklyView({ babyId }: { babyId: string }) {
  const { data, isLoading } = useWeeklyHistory(babyId)

  if (isLoading) return <HistorySkeleton />
  if (!data) return null

  const { feeding, sleep, diaperByDay } = data

  const diaperChartData = Object.entries(diaperByDay).map(([date, counts]) => ({
    date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    Wet: counts.wet,
    Dirty: counts.dirty,
    Both: counts.both,
  }))

  return (
    <div className="space-y-4">
      {/* Feeding stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
          7-Day Feeding
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Avg feeds/day" value={String(feeding.avgFeedsPerDay)} sub={`${feeding.totalFeeds} total`} />
          <StatCard
            label="Avg breast duration"
            value={feeding.avgBreastDurationSec > 0 ? formatSec(feeding.avgBreastDurationSec) : '—'}
            sub={feeding.breastFeedCount > 0 ? `${feeding.breastFeedCount} sessions` : 'No breast feeds'}
          />
          <StatCard
            label="Total bottle/pump vol."
            value={feeding.totalVolumeOz > 0 ? `${feeding.totalVolumeOz} oz` : '—'}
          />
          <StatCard label="Total feeds" value={String(feeding.totalFeeds)} />
        </div>
      </div>

      {/* Sleep stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
          7-Day Sleep
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Avg sleep/day"
            value={formatSec(sleep.avgSleepPerDaySec)}
            sub={`${sleep.sessionCount} sessions`}
          />
          <StatCard label="Longest stretch" value={sleep.longestStretchSec > 0 ? formatSec(sleep.longestStretchSec) : '—'} />
        </div>
      </div>

      {/* Diaper chart */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
          Diaper History
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={diaperChartData} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-gray-400, #9ca3af)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--color-gray-400, #9ca3af)' }}
                axisLine={false}
                tickLine={false}
                width={22}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg2, #1f2937)',
                  border: '1px solid rgba(156,163,175,0.2)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="Wet" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Dirty" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Both" fill="#a78bfa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const { babyId } = useAuthStore()
  const [tab, setTab] = useState<Tab>('weekly')
  const [date, setDate] = useState(() => toLocalDateValue(new Date()))

  const maxDate = toLocalDateValue(new Date())

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">History & Reports</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Logs and 7-day summaries</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 md:max-w-2xl">
        {/* Tab selector — flex-nowrap keeps all 3 in a single row on mobile */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 mb-4">
          {([
            ['weekly', 'Summary'],
            ['daily', 'Daily'],
            ['export', 'Export'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date picker for daily view */}
        {tab === 'daily' && (
          <div className="mb-4">
            <input
              type="date"
              value={date}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {tab === 'weekly' ? (
          <WeeklyView babyId={babyId!} />
        ) : tab === 'daily' ? (
          <DailyView babyId={babyId!} date={date} />
        ) : (
          <ExportContent />
        )}
      </div>
    </div>
  )
}
