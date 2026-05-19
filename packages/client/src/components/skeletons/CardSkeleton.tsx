import { TextLineSkeleton } from './TextLineSkeleton'

const WIDTHS = ['w-3/4', 'w-full', 'w-2/3', 'w-1/2']

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <TextLineSkeleton key={i} width={WIDTHS[i % WIDTHS.length]} />
      ))}
    </div>
  )
}
