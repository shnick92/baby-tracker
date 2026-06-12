import { useState, useRef } from 'react'

import { useAuthStore } from '@stores/authStore'
import { useDailyHistory } from '@features/history'

import { useCalendarMonth, type DayPresence } from './useCalendar'
import { CalendarSkeleton } from './CalendarSkeleton'

type FilterKey = 'all' | 'feedings' | 'sleep' | 'diapers' | 'visitors'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  feedings: 'Feedings',
  sleep: 'Sleep',
  diapers: 'Diapers',
  visitors: 'Visits',
}

const FILTERS: FilterKey[] = ['all', 'feedings', 'sleep', 'diapers', 'visitors']

const DOT_BG: Record<Exclude<FilterKey, 'all'>, string> = {
  feedings: 'bg-blue-400',
  sleep: 'bg-green-400 dot-sleep',
  diapers: 'bg-amber-400',
  visitors: 'bg-purple-400',
}

const CATEGORY_ORDER: Exclude<FilterKey, 'all'>[] = ['feedings', 'sleep', 'diapers', 'visitors']

const FEEDING_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Breastfeed · Left',
  BREAST_RIGHT: 'Breastfeed · Right',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

const DIAPER_LABEL: Record<string, string> = { WET: 'Wet', DIRTY: 'Dirty', BOTH: 'Both' }

const MOOD_LABEL: Record<string, string> = {
  HAPPY: 'Happy 😄', FUSSY: 'Fussy 😤', CRYING: 'Crying 😢',
  SLEEPING: 'Sleeping 😴', ALERT: 'Alert 👁', BATH: 'Bath 🛁', WALK: 'Walk 🚶',
}

function toLocalDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

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

function formatDayHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return toLocalDate(new Date()) === dateStr
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDotsForDay(presence: DayPresence | undefined, filter: FilterKey): Exclude<FilterKey, 'all'>[] {
  if (!presence) return []
  const categories: Exclude<FilterKey, 'all'>[] = filter === 'all'
    ? CATEGORY_ORDER
    : [filter as Exclude<FilterKey, 'all'>]
  return categories.filter((cat) => presence[cat])
}

// ─── Colour legend ────────────────────────────────────────────────────────────

function ColourLegend() {
  return (
    <div className="flex gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${DOT_BG[cat]}`} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
            {cat === 'feedings' ? 'Feedings' : cat === 'sleep' ? 'Sleep' : cat === 'diapers' ? 'Diapers' : 'Visits'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

type DayDetailProps = {
  dateStr: string
  babyId: string
  filter: FilterKey
  panelMode?: boolean
}

function DayDetail({ dateStr, babyId, filter, panelMode = false }: DayDetailProps) {
  const { data, isLoading } = useDailyHistory(babyId, dateStr)

  type EventItem = {
    time: string
    label: string
    sub?: string
    category: Exclude<FilterKey, 'all'>
  }

  const events: EventItem[] = []

  if (data) {
    const { feedings, sleeps, diapers, medications, tummyTimes, moods, visitors } = data

    for (const f of feedings) {
      if (filter !== 'all' && filter !== 'feedings') continue
      const ts = f.endedAt ?? f.startedAt
      let label = FEEDING_LABEL[f.type] ?? f.type
      if (f.type === 'BOTTLE') {
        label = f.formulaName || (f.milkType === 'FORMULA' ? 'Formula' : 'Breast Milk')
        label = `Bottle — ${label}`
      }
      const subs: string[] = []
      if (f.volumeOz != null) subs.push(`${f.volumeOz} oz`)
      if (f.durationSec != null) subs.push(formatSec(f.durationSec))
      subs.push(`by ${f.loggedBy.name}`)
      events.push({ time: ts, label, sub: subs.join(' · '), category: 'feedings' })
    }

    for (const s of sleeps) {
      if (filter !== 'all' && filter !== 'sleep') continue
      const dur = s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
        : null
      const subs: string[] = []
      if (dur != null) subs.push(formatSec(dur))
      else subs.push('In progress')
      subs.push(`by ${s.loggedBy.name}`)
      events.push({
        time: s.startedAt,
        label: s.type === 'NAP' ? 'Nap' : 'Night Sleep',
        sub: subs.join(' · '),
        category: 'sleep',
      })
    }

    for (const d of diapers) {
      if (filter !== 'all' && filter !== 'diapers') continue
      events.push({
        time: d.occurredAt,
        label: `${DIAPER_LABEL[d.type] ?? d.type} diaper`,
        sub: `by ${d.loggedBy.name}`,
        category: 'diapers',
      })
    }

    for (const m of medications) {
      if (filter !== 'all') continue
      events.push({ time: m.givenAt, label: `Medication — ${m.name}`, sub: m.dosageNote ?? undefined, category: 'feedings' })
    }

    for (const t of tummyTimes) {
      if (filter !== 'all') continue
      events.push({
        time: t.startedAt,
        label: 'Tummy Time',
        sub: t.durationSec != null ? formatSec(t.durationSec) : undefined,
        category: 'sleep',
      })
    }

    for (const m of moods) {
      if (filter !== 'all') continue
      const label = m.customActivity
        ? `${m.customActivity.emoji} ${m.customActivity.name}`
        : MOOD_LABEL[m.mood ?? ''] ?? m.mood ?? 'Mood'
      events.push({ time: m.occurredAt, label, category: 'feedings' })
    }

    for (const v of visitors) {
      if (filter !== 'all' && filter !== 'visitors') continue
      const subs: string[] = []
      if (v.startTime) subs.push(formatTime(v.startTime))
      if (v.notes) subs.push(v.notes)
      events.push({
        time: v.startTime ?? `${v.date}T12:00:00Z`,
        label: v.name,
        sub: subs.join(' · ') || undefined,
        category: 'visitors',
      })
    }

    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  }

  const heading = isToday(dateStr) ? `Today · ${formatDayHeading(dateStr)}` : formatDayHeading(dateStr)

  if (panelMode) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="text-base font-bold text-gray-900 dark:text-gray-100">{heading}</div>
          {!isLoading && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''}</div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">No events logged</p>
            </div>
          ) : (
            events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 min-h-[56px]"
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT_BG[ev.category]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{ev.label}</p>
                  {ev.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ev.sub}</p>}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTime(ev.time)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 px-4 py-3 border-t border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{heading}</span>
        {!isLoading && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">No events logged</p>
        </div>
      ) : (
        events.map((ev, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-700 min-h-[52px]"
          >
            <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${DOT_BG[ev.category]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{ev.label}</p>
              {ev.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ev.sub}</p>}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTime(ev.time)}</span>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Month grid ───────────────────────────────────────────────────────────────

type MonthGridProps = {
  year: number
  month: number
  babyId: string
  filter: FilterKey
  selectedDate: string
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function MonthGrid({ year, month, babyId, filter, selectedDate, onSelectDate, onPrevMonth, onNextMonth }: MonthGridProps) {
  const { data, isLoading } = useCalendarMonth(babyId, year, month)
  const touchStartX = useRef<number | null>(null)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)
  const todayStr = toLocalDate(new Date())

  const padded = (n: number) => String(n).padStart(2, '0')

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -50) onNextMonth()
    else if (dx > 50) onPrevMonth()
  }

  if (isLoading) return <CalendarSkeleton />

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors text-lg"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatMonthYear(year, month)}
        </span>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors text-lg"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 px-3 gap-0.5">
        {/* Leading blank cells */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${padded(month)}-${padded(day)}`
          const presence = data?.days[dateStr]
          const dots = getDotsForDay(presence, filter)
          const today = dateStr === todayStr
          const selected = dateStr === selectedDate

          const MAX_DOTS = 4
          const visibleDots = dots.slice(0, MAX_DOTS)
          const overflow = dots.length > MAX_DOTS ? dots.length - MAX_DOTS : 0

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center pt-1.5 pb-2 rounded-lg min-h-[52px] transition-colors ${
                selected
                  ? 'bg-blue-50 dark:bg-blue-900/30 outline outline-[1.5px] outline-blue-300 dark:outline-blue-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-100 dark:active:bg-gray-700/60'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] leading-none font-medium ${
                  today && selected
                    ? 'bg-blue-500 text-white'
                    : today
                    ? 'text-blue-500 dark:text-blue-400 font-bold'
                    : selected
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {day}
              </span>
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[36px]">
                {visibleDots.map((cat, di) => (
                  <div key={di} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_BG[cat]}`} />
                ))}
                {overflow > 0 && (
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">+{overflow}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function FilterChips({ filter, onChange }: { filter: FilterKey; onChange: (f: FilterKey) => void }) {
  return (
    <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-gray-100 dark:border-gray-700 flex-shrink-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
            filter === f
              ? 'bg-blue-400 dark:bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
          }`}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function getStoredFilter(): FilterKey {
  try {
    const v = localStorage.getItem('calendar_filter')
    if (v && FILTERS.includes(v as FilterKey)) return v as FilterKey
  } catch {
    // localStorage unavailable in some contexts
  }
  return 'all'
}

export function CalendarPage() {
  const { babyId } = useAuthStore()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(toLocalDate(today))
  const [filter, setFilter] = useState<FilterKey>(getStoredFilter)

  const handleFilterChange = (f: FilterKey) => {
    setFilter(f)
    try { localStorage.setItem('calendar_filter', f) } catch { /* localStorage unavailable */ }
  }

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  if (!babyId) return null

  return (
    <div className="bg-gray-50 dark:bg-gray-900 md:h-full md:min-h-0 md:overflow-hidden">
      {/* Tablet layout: split panel */}
      <div className="hidden md:flex md:flex-col h-full">
        <FilterChips filter={filter} onChange={handleFilterChange} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: month grid — static, does not scroll */}
          <div className="w-[55%] flex flex-col border-r border-gray-100 dark:border-gray-700 overflow-hidden">
            <MonthGrid
              year={year} month={month} babyId={babyId} filter={filter}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
            <ColourLegend />
          </div>
          {/* Right: day detail — scrolls independently */}
          <div className="flex-1 overflow-hidden">
            <DayDetail dateStr={selectedDate} babyId={babyId} filter={filter} panelMode />
          </div>
        </div>
      </div>

      {/* Mobile layout: viewport-locked split — calendar fixed, activity scrolls */}
      <div className="md:hidden flex flex-col h-[calc(100dvh-56px)] overflow-hidden">
        {/* Fixed top: header + filter chips + calendar grid */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Calendar</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatMonthYear(year, month)}</p>
          </div>
          <FilterChips filter={filter} onChange={handleFilterChange} />
          <MonthGrid
            year={year} month={month} babyId={babyId} filter={filter}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </div>
        {/* Scrollable bottom: activity feed */}
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <DayDetail dateStr={selectedDate} babyId={babyId} filter={filter} />
        </div>
      </div>
    </div>
  )
}
