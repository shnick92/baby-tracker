import { usePregnancyStatus } from './usePregnancyStatus'
import { PregnancyProgressSkeleton } from './PregnancyProgressSkeleton'

const RADIUS = 56
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function PregnancyProgressWidget() {
  const { data } = usePregnancyStatus()

  if (data === undefined) return <PregnancyProgressSkeleton />
  if (!data || data.born) return null

  const offset = CIRCUMFERENCE * (1 - data.progressPct / 100)
  const [y, m, d] = data.dueDate.slice(0, 10).split('-').map(Number)
  const formattedDue = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Pregnancy
        </p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          Week {data.weeksPregnant} of 40
        </span>
      </div>

      <div className="flex justify-center">
        <svg
          width="144"
          height="144"
          viewBox="0 0 144 144"
          aria-label={`${data.weeksPregnant} weeks pregnant, ${data.progressPct}% complete`}
          role="img"
        >
          <circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            className="stroke-gray-100 dark:stroke-gray-700"
            strokeWidth="10"
          />
          <circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            className="stroke-blue-500 dark:stroke-blue-400"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 72 72)"
          />
          <text
            x="72"
            y="66"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="24"
            fontWeight="700"
            className="fill-gray-900 dark:fill-gray-100"
          >
            {data.progressPct}%
          </text>
          <text
            x="72"
            y="84"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            className="fill-gray-400 dark:fill-gray-500"
          >
            complete
          </text>
        </svg>
      </div>

      <div className="text-center mt-1">
        <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">
          About a {data.babySize}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Due {formattedDue} · {data.weeksRemaining} weeks to go
        </p>
      </div>
    </div>
  )
}
