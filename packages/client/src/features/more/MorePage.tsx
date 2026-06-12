import { Link } from 'react-router-dom'
import { ShoppingBag, Users, Pill, Scale, Bell, History, CalendarDays, Settings, Sparkles, Thermometer, Syringe, Star, Baby } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'

type MoreItem = {
  to: string
  icon: React.ReactNode
  label: string
  description: string
}

type MoreGroup = {
  label: string
  items: MoreItem[]
}

// ── Items ──────────────────────────────────────────────────────────────────

const ILLNESS: MoreItem = {
  to: '/illness',
  icon: <Thermometer size={22} />,
  label: 'Illness Tracker',
  description: 'Track sick episodes, temperatures, and generate doctor handoff reports',
}
const AI_CHAT: MoreItem = {
  to: '/ai/chat',
  icon: <Sparkles size={22} />,
  label: 'Is This Normal?',
  description: "AI assistant — ask questions about your baby's patterns using real data",
}
const CALENDAR: MoreItem = {
  to: '/calendar',
  icon: <CalendarDays size={22} />,
  label: 'Calendar',
  description: 'Monthly view of all tracked events — feedings, sleep, diapers & visitors',
}
const VISITORS: MoreItem = {
  to: '/visitors',
  icon: <Users size={22} />,
  label: 'Visitors',
  description: 'Schedule and manage visitor time slots',
}
const MEDICATION: MoreItem = {
  to: '/medication',
  icon: <Pill size={22} />,
  label: 'Medication',
  description: 'Track medications, doses, and timing',
}
const WEIGHT: MoreItem = {
  to: '/growth',
  icon: <Scale size={22} />,
  label: 'Weight & Growth',
  description: 'Weight & height logs with WHO reference charts',
}
const MILESTONES: MoreItem = {
  to: '/milestones',
  icon: <Star size={22} />,
  label: 'Milestones',
  description: 'Track CDC developmental milestones and custom achievements',
}
const VACCINATIONS: MoreItem = {
  to: '/vaccinations',
  icon: <Syringe size={22} />,
  label: 'Vaccinations',
  description: 'Track administered doses against the CDC recommended schedule',
}
const BABY_NAMES: MoreItem = {
  to: '/names',
  icon: <Baby size={22} />,
  label: 'Baby Names',
  description: 'Add name candidates and react with your partner',
}
const TUMMY_TIME: MoreItem = {
  to: '/tummy-time',
  icon: <span className="text-2xl">🐢</span>,
  label: 'Tummy Time',
  description: 'Track tummy time sessions and daily totals',
}
const MOOD: MoreItem = {
  to: '/mood',
  icon: <span className="text-2xl">😊</span>,
  label: 'Mood & Activity',
  description: 'Log mood, bath, walks, and other activities',
}
const HISTORY: MoreItem = {
  to: '/history',
  icon: <History size={22} />,
  label: 'History & Reports',
  description: 'Daily logs view and 7-day feeding, sleep & diaper summaries',
}
const ALERTS: MoreItem = {
  to: '/alerts',
  icon: <Bell size={22} />,
  label: 'Alert History',
  description: 'Recent SOS alerts sent and received',
}
const SETTINGS: MoreItem = {
  to: '/settings',
  icon: <Settings size={22} />,
  label: 'Settings',
  description: 'Theme, units & notifications',
}
const PURCHASES: MoreItem = {
  to: '/purchases',
  icon: <ShoppingBag size={22} />,
  label: 'Purchases',
  description: 'Track what you need, bought, and received as gifts',
}
const PREGNANCY_PREP: MoreItem = {
  to: '/checklist/hospital_bag_mom',
  icon: <span className="text-2xl">🤰</span>,
  label: 'Pregnancy Prep',
  description: 'Hospital bag, home prep & before-home checklists',
}

// ── Groups ─────────────────────────────────────────────────────────────────

const BABY_MODE_GROUPS: MoreGroup[] = [
  { label: 'Health', items: [ILLNESS, AI_CHAT, MEDICATION, WEIGHT, MILESTONES, VACCINATIONS, TUMMY_TIME, MOOD] },
  { label: 'Reports', items: [HISTORY, CALENDAR] },
  { label: 'Planning', items: [VISITORS, PURCHASES, PREGNANCY_PREP] },
  { label: 'System', items: [ALERTS, SETTINGS] },
]

const PREGNANCY_MODE_GROUPS: MoreGroup[] = [
  { label: 'Planning', items: [BABY_NAMES, PREGNANCY_PREP, PURCHASES, VISITORS] },
  { label: 'Health', items: [AI_CHAT, MEDICATION, WEIGHT, MILESTONES, VACCINATIONS, TUMMY_TIME, MOOD, ILLNESS] },
  { label: 'Reports', items: [HISTORY, CALENDAR] },
  { label: 'System', items: [ALERTS, SETTINGS] },
]

// ── Page ───────────────────────────────────────────────────────────────────

export function MorePage() {
  const birthDate = useAuthStore((s) => s.birthDate)
  const groups = birthDate !== null ? BABY_MODE_GROUPS : PREGNANCY_MODE_GROUPS

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">More</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Planning & history</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-2">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
                >
                  <span className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
