import { useToastStore } from '@stores/toastStore'

export function Toast() {
  const { toasts, dismiss } = useToastStore()
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-gray-900 dark:bg-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg min-w-[200px] max-w-sm"
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-gray-400 hover:text-white flex-shrink-0 text-base leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
