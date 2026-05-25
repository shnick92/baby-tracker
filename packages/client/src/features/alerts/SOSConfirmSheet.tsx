import { useState, useRef, useEffect } from 'react'
import { useSosStore } from '@stores/sosStore'
import { useAuthStore } from '@stores/authStore'
import { useSwipeDown } from '@hooks/useSwipeDown'
import { useSendSos } from './useAlerts'

const HOLD_MS = 2000

type Props = {
  babyId: string
  onClose: () => void
}

export function SOSConfirmSheet({ babyId, onClose }: Props) {
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number | null>(null)
  const setCooldown = useSosStore((s) => s.setCooldown)
  const senderName = useAuthStore((s) => s.user?.name?.split(' ')[0] ?? '')
  const sendSos = useSendSos()
  const swipeRef = useSwipeDown(onClose)

  useEffect(() => {
    return () => {
      if (holdRef.current) clearInterval(holdRef.current)
    }
  }, [])

  function startHold() {
    if (sent || sendSos.isPending) return
    startRef.current = Date.now()
    holdRef.current = setInterval(() => {
      const elapsed = Date.now() - (startRef.current ?? Date.now())
      const pct = Math.min((elapsed / HOLD_MS) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(holdRef.current!)
        holdRef.current = null
        fire()
      }
    }, 16)
  }

  function cancelHold() {
    if (holdRef.current) {
      clearInterval(holdRef.current)
      holdRef.current = null
    }
    setProgress(0)
  }

  function fire() {
    setSent(true)
    sendSos.mutate(
      { babyId, message: message.trim() || undefined },
      {
        onSuccess: () => {
          setCooldown()
          setTimeout(onClose, 1000)
        },
        onError: () => setSent(false),
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Dark sheet — matches mockup */}
      <div ref={swipeRef} className="relative w-full max-w-lg rounded-t-3xl px-5 pt-7 pb-8 space-y-4 safe-bottom"
        style={{ background: '#1c1c22' }}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* "Sending as X → your partner" */}
        <p className="text-center text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Sending as {senderName} → your partner
        </p>

        {/* Icon */}
        <div className="text-center text-5xl leading-none">🚨</div>

        {/* Title */}
        <h2 className="text-center text-lg font-bold text-white">Send SOS?</h2>

        {/* Subtitle */}
        <p className="text-center text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Your partner will receive a push notification immediately.
        </p>

        {/* Optional message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message (e.g. Baby won't stop crying)"
          maxLength={200}
          rows={2}
          className="w-full rounded-xl text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
        />

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-green-400">SOS sent!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              Cancel
            </button>

            {/* Send + hold bar */}
            <div>
              <p className="text-center text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Hold Send for 2 seconds to confirm
              </p>
              <div className="relative h-14 rounded-2xl overflow-hidden select-none">
                {/* Amber progress fill behind button */}
                <div
                  className="absolute inset-y-0 left-0 rounded-2xl transition-none"
                  style={{ width: `${progress}%`, background: '#f59e0b' }}
                />
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center gap-2 font-bold text-base rounded-2xl"
                  style={{ background: progress > 0 ? 'transparent' : '#ef4444', color: '#fff' }}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                  disabled={sendSos.isPending}
                >
                  {progress > 0 ? `Sending… ${Math.round(progress)}%` : 'Send Alert'}
                </button>
              </div>
              {/* Progress bar track */}
              <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-none"
                  style={{ width: `${progress}%`, background: '#f59e0b' }}
                />
              </div>
              <p className="text-center text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Hold 2s to send</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
