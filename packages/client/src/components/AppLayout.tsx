import { Outlet, Link, useLocation } from 'react-router-dom'

import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'

const SOCKET_RING: Record<string, string> = {
  connecting: '0 0 0 2px #f59e0b',
  synced: '0 0 0 2px #22c55e',
  unsynced: '0 0 0 2px #ef4444',
}

type NavItem = { to: string; label: string; icon: string; prefix: string; exact?: boolean }

const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '⊞', prefix: '/', exact: true },
  { to: '/feeding', label: 'Feeding', icon: '🍼', prefix: '/feeding' },
  { to: '/sleep', label: 'Sleep', icon: '😴', prefix: '/sleep' },
  { to: '/diaper', label: 'Diapers', icon: '💧', prefix: '/diaper' },
  { to: '/checklist/hospital_bag_mom', label: 'Pregnancy Prep', icon: '🤰', prefix: '/checklist' },
  { to: '/purchases', label: 'Purchases', icon: '🛍', prefix: '/purchases' },
  { to: '/visitors', label: 'Visitors', icon: '👥', prefix: '/visitors' },
]

const BOTTOM_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: '⊞', prefix: '/', exact: true },
  { to: '/feeding', label: 'Feed', icon: '🍼', prefix: '/feeding' },
  { to: '/sleep', label: 'Sleep', icon: '😴', prefix: '/sleep' },
  { to: '/diaper', label: 'Diaper', icon: '💧', prefix: '/diaper' },
  { to: '/checklist/hospital_bag_mom', label: 'More', icon: '⋯', prefix: '/checklist' },
]

function isMoreActive(pathname: string): boolean {
  return (
    pathname.startsWith('/checklist') ||
    pathname.startsWith('/purchases') ||
    pathname.startsWith('/visitors')
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/feeding')) return 'Feeding'
  if (pathname.startsWith('/sleep')) return 'Sleep'
  if (pathname.startsWith('/diaper')) return 'Diapers'
  if (pathname.startsWith('/checklist')) return 'Pregnancy Prep'
  if (pathname.startsWith('/purchases')) return 'Purchases'
  if (pathname.startsWith('/visitors')) return 'Visitor Schedule'
  return 'Baby Tracker'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function AppLayout() {
  const { user, logout } = useAuthStore()
  const socketStatus = useSocketStore((s) => s.status)
  const location = useLocation()

  const handleLogout = () => {
    api.post('/api/auth/logout').catch(() => null).finally(() => logout())
  }

  return (
    <div className="md:flex md:min-h-screen">
      {/* Sidebar — tablet only */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700">
        <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-base select-none">
            👶
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">Baby Tracker</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.prefix
              : location.pathname.startsWith(item.prefix)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-shrink-0">
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
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — tablet only */}
        <div className="hidden md:flex h-12 items-center px-5 justify-between bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{getPageTitle(location.pathname)}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate()}</span>
        </div>

        {/* Offline banner */}
        {socketStatus === 'unsynced' && (
          <div className="bg-red-500 text-white text-xs font-medium text-center py-1.5 px-4">
            Offline — changes will sync when reconnected
          </div>
        )}

        <Outlet />

        {/* Bottom nav — mobile only */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex safe-bottom">
          {BOTTOM_NAV.map((item) => {
            const isActive =
              item.prefix === '/checklist'
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
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav spacer on mobile */}
        <div className="md:hidden h-[56px] flex-shrink-0" />
      </div>
    </div>
  )
}
