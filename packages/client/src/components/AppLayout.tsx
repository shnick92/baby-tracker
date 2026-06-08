import { createContext, useContext, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Moon,
  Droplets,
  Users,
  ShoppingBag,
  Pill,
  Scale,
  Bell,
  History,
  CalendarDays,
  MoreHorizontal,
  Sparkles,
  Thermometer,
  Syringe,
  Star,
  Baby,
} from 'lucide-react'

const TopbarActionsContext = createContext<(node: React.ReactNode) => void>(() => {})
export const useTopbarActions = () => useContext(TopbarActionsContext)

import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { SOSButton } from '@features/alerts'
import { BabyBottleIcon } from '@components/icons'

const SOCKET_RING: Record<string, string> = {
  connecting: '0 0 0 2px #f59e0b',
  synced: '0 0 0 2px #22c55e',
  unsynced: '0 0 0 2px #ef4444',
}

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  prefix: string
  exact?: boolean
}

type SidebarGroup = {
  label?: string
  items: NavItem[]
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} />, prefix: '/', exact: true },
    ],
  },
  {
    label: 'Daily',
    items: [
      { to: '/feeding', label: 'Feeding', icon: <BabyBottleIcon size={16} />, prefix: '/feeding' },
      { to: '/sleep', label: 'Sleep', icon: <Moon size={16} />, prefix: '/sleep' },
      { to: '/diaper', label: 'Diapers', icon: <Droplets size={16} />, prefix: '/diaper' },
      { to: '/visitors', label: 'Visitors', icon: <Users size={16} />, prefix: '/visitors' },
    ],
  },
  {
    label: 'Health',
    items: [
      { to: '/illness', label: 'Illness Tracker', icon: <Thermometer size={16} />, prefix: '/illness' },
      { to: '/medication', label: 'Medication', icon: <Pill size={16} />, prefix: '/medication' },
      { to: '/growth', label: 'Weight & Growth', icon: <Scale size={16} />, prefix: '/growth' },
      { to: '/milestones', label: 'Milestones', icon: <Star size={16} />, prefix: '/milestones' },
      { to: '/vaccinations', label: 'Vaccinations', icon: <Syringe size={16} />, prefix: '/vaccinations' },
      { to: '/tummy-time', label: 'Tummy Time', icon: <span className="text-sm">🐢</span>, prefix: '/tummy-time' },
      { to: '/mood', label: 'Mood & Activity', icon: <span className="text-sm">😊</span>, prefix: '/mood' },
      { to: '/ai/chat', label: 'Is This Normal?', icon: <Sparkles size={16} />, prefix: '/ai' },
    ],
  },
  {
    label: 'Pregnancy',
    items: [
      { to: '/names', label: 'Baby Names', icon: <Baby size={16} />, prefix: '/names' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/checklist/hospital_bag_mom', label: 'Pregnancy Prep', icon: <span className="text-sm">🤰</span>, prefix: '/checklist' },
      { to: '/purchases', label: 'Purchases', icon: <ShoppingBag size={16} />, prefix: '/purchases' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/history', label: 'History', icon: <History size={16} />, prefix: '/history' },
      { to: '/calendar', label: 'Calendar', icon: <CalendarDays size={16} />, prefix: '/calendar' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/alerts', label: 'Alert History', icon: <Bell size={16} />, prefix: '/alerts' },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: <LayoutDashboard size={22} />, prefix: '/', exact: true },
  { to: '/feeding', label: 'Feed', icon: <BabyBottleIcon size={22} />, prefix: '/feeding' },
  { to: '/sleep', label: 'Sleep', icon: <Moon size={22} />, prefix: '/sleep' },
  { to: '/diaper', label: 'Diaper', icon: <Droplets size={22} />, prefix: '/diaper' },
  { to: '/more', label: 'More', icon: <MoreHorizontal size={22} />, prefix: '/more' },
]

function isMoreActive(pathname: string): boolean {
  return (
    pathname.startsWith('/more') ||
    pathname.startsWith('/checklist') ||
    pathname.startsWith('/purchases') ||
    pathname.startsWith('/visitors') ||
    pathname.startsWith('/alerts') ||
    pathname.startsWith('/medication') ||
    pathname.startsWith('/weight') ||
    pathname.startsWith('/growth') ||
    pathname.startsWith('/tummy-time') ||
    pathname.startsWith('/mood') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/ai') ||
    pathname.startsWith('/illness') ||
    pathname.startsWith('/milestones') ||
    pathname.startsWith('/vaccinations') ||
    pathname.startsWith('/names')
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/feeding')) return 'Feeding'
  if (pathname.startsWith('/sleep')) return 'Sleep'
  if (pathname.startsWith('/diaper')) return 'Diapers'
  if (pathname === '/more') return 'More'
  if (pathname.startsWith('/checklist')) return 'Pregnancy Prep'
  if (pathname.startsWith('/purchases')) return 'Purchases'
  if (pathname.startsWith('/visitors')) return 'Visitor Schedule'
  if (pathname.startsWith('/alerts')) return 'Alert History'
  if (pathname.startsWith('/medication')) return 'Medication'
  if (pathname.startsWith('/weight')) return 'Weight'
  if (pathname.startsWith('/growth')) return 'Weight & Growth'
  if (pathname.startsWith('/tummy-time')) return 'Tummy Time'
  if (pathname.startsWith('/mood')) return 'Mood & Activity'
  if (pathname.startsWith('/history')) return 'History & Reports'
  if (pathname.startsWith('/calendar')) return 'Calendar'
  if (pathname.startsWith('/ai')) return 'Is This Normal?'
  if (pathname.startsWith('/illness')) return 'Illness Tracker'
  if (pathname.startsWith('/milestones')) return 'Milestones'
  if (pathname.startsWith('/vaccinations')) return 'Vaccinations'
  if (pathname.startsWith('/names')) return 'Baby Names'
  return 'Baby Tracker'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function AppLayout() {
  const { user, babyId, logout } = useAuthStore()
  const socketStatus = useSocketStore((s) => s.status)
  const location = useLocation()
  const [topbarAction, setTopbarAction] = useState<React.ReactNode>(null)

  const handleLogout = () => {
    api.post('/api/auth/logout').catch(() => null).finally(() => logout())
  }

  return (
    <TopbarActionsContext.Provider value={setTopbarAction}>
    <div className="md:flex md:h-screen">
      {/* Sidebar — tablet only */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700">
        <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="w-8 h-8 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-base select-none">
            🌙
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">Tracker</span>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {SIDEBAR_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.prefix
                    : location.pathname.startsWith(item.prefix)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <span className="flex-shrink-0 flex items-center justify-center w-4 h-4">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 space-y-2">
          {babyId && <SOSButton babyId={babyId} variant="full" />}
          <div className="flex items-center gap-3 px-1">
            <div
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300 flex-shrink-0"
              style={{ boxShadow: SOCKET_RING[socketStatus] }}
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Parent</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Out
            </button>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — tablet only */}
        <div className="hidden md:flex h-12 items-center px-5 justify-between bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{getPageTitle(location.pathname)}</span>
          <div className="flex items-center gap-4">
            {topbarAction}
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate()}</span>
          </div>
        </div>

        {/* Offline banner */}
        {socketStatus === 'unsynced' && (
          <div className="bg-red-500 text-white text-xs font-medium text-center py-1.5 px-4">
            Offline — changes will sync when reconnected
          </div>
        )}

        <div className="flex-1 min-h-0 md:overflow-y-auto">
          <Outlet />
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex safe-bottom">
          {BOTTOM_NAV.map((item) => {
            const isActive =
              item.prefix === '/more'
                ? isMoreActive(location.pathname)
                : item.exact
                  ? location.pathname === item.prefix
                  : location.pathname.startsWith(item.prefix)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span className="flex items-center justify-center h-6">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav spacer on mobile */}
        <div className="md:hidden h-[56px] flex-shrink-0" />
      </div>
    </div>
    </TopbarActionsContext.Provider>
  )
}
