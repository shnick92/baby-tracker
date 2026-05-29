import { FEVER_F, formatTime } from '../utils/formatters'

type Props = {
  readings: Array<{ tempF: number; recordedAt: string }>
}

export function TempSparkline({ readings }: Props) {
  if (readings.length < 2) return null

  const temps = readings.map((r) => r.tempF)
  const minT = Math.min(...temps, 97)
  const maxT = Math.max(...temps, 103)
  const range = maxT - minT || 1

  const W = 300
  const H = 56
  const pad = 14

  function x(i: number) { return pad + (i / (readings.length - 1)) * (W - pad * 2) }
  function y(t: number) { return H - pad - ((t - minT) / range) * (H - pad * 2) }

  const fevertY = y(FEVER_F)

  return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600 p-3 mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
        Temperature trend
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {fevertY > 0 && fevertY < H && (
          <>
            <line x1={0} y1={fevertY} x2={W} y2={fevertY} stroke="rgba(245,158,11,0.4)" strokeWidth={1} strokeDasharray="4 3" />
            <text x={4} y={fevertY - 3} fontSize={8} fill="rgba(245,158,11,0.7)" fontFamily="-apple-system,sans-serif">100.4°F</text>
          </>
        )}
        {readings.slice(1).map((r, i) => {
          const aboveFever = readings[i].tempF >= FEVER_F || r.tempF >= FEVER_F
          return (
            <line
              key={i}
              x1={x(i).toFixed(1)} y1={y(readings[i].tempF).toFixed(1)}
              x2={x(i + 1).toFixed(1)} y2={y(r.tempF).toFixed(1)}
              stroke={aboveFever ? '#f87171' : '#7ec8a0'}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}
        {readings.map((r, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(r.tempF)}
            r={3.5}
            fill={r.tempF >= FEVER_F ? '#f87171' : '#7ec8a0'}
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(readings[0].recordedAt)}</span>
        {temps.some((t) => t >= FEVER_F) && (
          <span className="text-[10px] text-red-500">Peak: {Math.max(...temps).toFixed(1)}°F</span>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(readings[readings.length - 1].recordedAt)}</span>
      </div>
    </div>
  )
}
