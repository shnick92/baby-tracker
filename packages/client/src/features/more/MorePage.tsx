import { Link } from 'react-router-dom'

type MoreItem = {
  to: string
  icon: string
  label: string
  description: string
}

const MORE_ITEMS: MoreItem[] = [
  {
    to: '/checklist/hospital_bag_mom',
    icon: '🤰',
    label: 'Pregnancy Prep',
    description: 'Hospital bag, home prep & before-home checklists',
  },
  {
    to: '/purchases',
    icon: '🛍',
    label: 'Purchases',
    description: 'Track what you need, bought, and received as gifts',
  },
  {
    to: '/visitors',
    icon: '👥',
    label: 'Visitors',
    description: 'Schedule and manage visitor time slots',
  },
  {
    to: '/alerts',
    icon: '🔔',
    label: 'Alert History',
    description: 'Recent SOS alerts sent and received',
  },
]

export function MorePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">More</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Planning & history</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-2">
        {MORE_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
          >
            <span className="text-2xl w-10 h-10 flex items-center justify-center flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </main>
    </div>
  )
}
