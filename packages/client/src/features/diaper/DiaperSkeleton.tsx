export function DiaperSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 py-4">
      <div className="h-14 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="h-px bg-gray-100 dark:bg-gray-700" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
