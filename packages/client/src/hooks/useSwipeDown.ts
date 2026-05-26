import { useRef, useEffect } from 'react'

export function useSwipeDown(onClose: () => void, threshold = 80) {
  const startY = useRef<number | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY
    }

    // Non-passive so we can preventDefault to block pull-to-refresh
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && el.scrollTop === 0) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startY.current === null) return
      const delta = e.changedTouches[0].clientY - startY.current
      startY.current = null
      if (delta > threshold) onClose()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onClose, threshold])

  return ref
}
