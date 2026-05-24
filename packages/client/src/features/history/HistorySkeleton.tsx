export function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      </div>
      {/* Log rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-2.5 w-20 bg-gray-100 dark:bg-gray-600 rounded" />
          </div>
          <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  )
}
