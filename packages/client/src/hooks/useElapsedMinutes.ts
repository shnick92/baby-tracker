import { useState, useEffect } from 'react'

export function useElapsedMinutes(startedAt: string | null | undefined): number {
  const [elapsed, setElapsed] = useState(() =>
    startedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))
      : 0,
  )

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)))
    tick()
    const id = setInterval(tick, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return elapsed
}
