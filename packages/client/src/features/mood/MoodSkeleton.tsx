export function MoodSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-20 bg-[var(--bg3)] rounded-2xl" />
        ))}
      </div>
      <div className="bg-[var(--bg3)] rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
