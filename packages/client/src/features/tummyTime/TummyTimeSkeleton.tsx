export function TummyTimeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-[var(--bg3)] rounded-2xl" />
      <div className="h-16 bg-[var(--bg3)] rounded-2xl" />
      <div className="bg-[var(--bg3)] rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-14 bg-gray-100 dark:bg-gray-700/60 rounded" />
            </div>
            <div className="h-3 w-10 bg-gray-100 dark:bg-gray-700/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
