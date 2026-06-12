import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'tracker-install-snoozed-until'
const SNOOZE_DAYS = 14

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function isSnoozed(): boolean {
  const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
  return Date.now() < until
}

// Bottom-sheet PWA install prompt. Captures Chrome's beforeinstallprompt
// event and re-surfaces it as an in-app sheet; "Maybe later" snoozes for 14 days.
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !installEvent) return null

  const handleInstall = async () => {
    setVisible(false)
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000))
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={handleDismiss}>
      <div
        className="w-full bg-white dark:bg-gray-800 rounded-t-3xl p-5 pb-8 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-3xl flex-shrink-0">
            🍼
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Install Tracker</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>
        <ul className="space-y-2.5 mb-5">
          {[
            'Works offline — view logs without WiFi',
            'Push notifications for feeding reminders',
            'Feels like a native app',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleInstall}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-2xl py-3.5 min-h-[48px] transition-colors"
        >
          Add to Home Screen
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full text-gray-400 dark:text-gray-500 text-sm font-medium py-3 min-h-[44px]"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
