import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { api } from '@lib/axios'
import { AddPasskeyButton } from '../auth/AddPasskeyButton'
import { ClipboardIcon, ShoppingBagIcon, UsersIcon, HomeIcon } from '@components/icons'

const SOCKET_RING: Record<string, string> = {
  connecting: '0 0 0 2px #f59e0b',
  synced: '0 0 0 2px #22c55e',
  unsynced: '0 0 0 2px #ef4444',
}

type NavCard = {
  to: string
  label: string
  sublabel: string
  icon: React.ReactNode
}

const NAV_CARDS: NavCard[] = [
  {
    to: '/checklist/hospital_bag_mom',
    label: 'Hospital Bags',
    sublabel: "Mom's & Baby's packing lists",
    icon: <ClipboardIcon />,
  },
  {
    to: '/checklist/home_prep',
    label: 'Home Prep',
    sublabel: 'Get ready before arrival',
    icon: <HomeIcon />,
  },
  {
    to: '/checklist/before_home',
    label: 'Before We Get Home',
    sublabel: 'Hospital discharge checklist',
    icon: <ClipboardIcon />,
  },
  {
    to: '/purchases',
    label: 'Purchases',
    sublabel: 'Track what you still need',
    icon: <ShoppingBagIcon />,
  },
  {
    to: '/visitors',
    label: 'Visitor Schedule',
    sublabel: 'Plan who comes and when',
    icon: <UsersIcon />,
  },
]

export function Dashboard() {
  const { user, logout, markPasskeyAdded } = useAuthStore()
  const socketStatus = useSocketStore((s) => s.status)
  const [showAddPasskey, setShowAddPasskey] = useState(false)

  const handleLogout = () => {
    api.post('/api/auth/logout').catch(() => null).finally(() => logout())
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold flex-shrink-0"
          style={{ boxShadow: SOCKET_RING[socketStatus] }}
        >
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">Baby Tracker</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3 px-1">
            Pregnancy Prep
          </h2>
          <div className="space-y-2">
            {NAV_CARDS.map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{card.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sublabel}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Baby Tracking</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Feeding, sleep & diaper logs coming in Phase 3.</p>
        </div>

        {!user?.hasPasskey && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Security</h2>
            {showAddPasskey ? (
              <AddPasskeyButton
                deviceName={`${user?.name}'s device`}
                onSuccess={markPasskeyAdded}
              />
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
