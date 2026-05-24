export function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Filter chips skeleton */}
      <div className="flex gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        {[80, 72, 56, 64, 52].map((w, i) => (
          <div key={i} className="h-7 rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: w }} />
        ))}
      </div>

      {/* Month nav skeleton */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="w-24 h-5 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* DOW header skeleton */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-center py-1">
            <div className="w-5 h-3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7 px-3 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  )
}
