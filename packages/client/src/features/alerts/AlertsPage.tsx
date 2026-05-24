import { useAuthStore } from '@stores/authStore'
import { useAlerts } from './useAlerts'
import { formatTimeAgo } from '@lib/utils'

const STATUS_LABEL: Record<string, string> = {
  SENT: 'Sent',
  SEEN: 'Seen',
  ACKNOWLEDGED: 'Acknowledged',
}

const STATUS_COLOR: Record<string, string> = {
  SENT: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  SEEN: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  ACKNOWLEDGED: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
}

export function AlertsPage() {
  const { babyId, user } = useAuthStore()
  const { data: alerts, isLoading } = useAlerts(babyId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Alert History</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last 10 SOS alerts</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : !alerts?.length ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">🔔</div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No SOS alerts yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Use the SOS button when you need immediate help</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isSender = alert.sentById === user?.id
            return (
              <div
                key={alert.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {isSender
                        ? `You → ${alert.sentTo.name.split(' ')[0]}`
                        : `${alert.sentBy.name.split(' ')[0]} → You`}
                    </p>
                    {alert.message && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        "{alert.message}"
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTimeAgo(alert.sentAt)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[alert.status]}`}>
                    {STATUS_LABEL[alert.status]}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
