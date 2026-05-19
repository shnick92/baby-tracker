import { usePregnancyStatus } from './usePregnancyStatus'
import { PregnancyProgressSkeleton } from './PregnancyProgressSkeleton'

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function PregnancyProgressWidget() {
  const { data } = usePregnancyStatus()

  if (data === undefined) return <PregnancyProgressSkeleton />
  if (!data || data.born) return null

  const offset = CIRCUMFERENCE * (1 - data.progressPct / 100)
  // Parse date part as local midnight — avoids UTC-offset shifting the displayed day
  const [dueDateYear, dueDateMonth, dueDateDay] = data.dueDate.slice(0, 10).split('-').map(Number)
  const formattedDue = new Date(dueDateYear, dueDateMonth - 1, dueDateDay).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-5">
      <div className="flex-shrink-0">
        <svg
          width="88"
          height="88"
          viewBox="0 0 120 120"
          aria-label={`${data.weeksPregnant} weeks pregnant`}
          role="img"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            className="stroke-gray-100 dark:stroke-gray-700"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            className="stroke-blue-500 dark:stroke-blue-400"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="60"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="20"
            fontWeight="700"
            className="fill-gray-900 dark:fill-gray-100"
          >
            {data.progressPct}%
          </text>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Week {data.weeksPregnant}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Baby is the size of a{' '}
          <span className="text-gray-700 dark:text-gray-300 font-medium">{data.babySize}</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {data.weeksRemaining} weeks until due · {formattedDue}
        </p>
      </div>
    </div>
  )
}
