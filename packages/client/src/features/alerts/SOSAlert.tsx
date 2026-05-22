import { useEffect, useRef } from 'react'
import { useSosStore } from '@stores/sosStore'
import { useAcknowledgeAlert } from './useAlerts'
import { formatTimeAgo } from '@lib/utils'

function playSiren() {
  try {
    const ctx = new AudioContext()
    const count = 3
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      const t0 = ctx.currentTime + i * 0.7
      osc.frequency.setValueAtTime(880, t0)
      osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.35)
      osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.7)
      gain.gain.setValueAtTime(0.8, t0)
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.65)
      osc.start(t0)
      osc.stop(t0 + 0.7)
    }
  } catch {
    // AudioContext not available
  }
}

export function SOSAlert() {
  const { incomingAlert, dismissAlert } = useSosStore()
  const acknowledge = useAcknowledgeAlert()
  const hasPlayed = useRef(false)

  useEffect(() => {
    if (incomingAlert && !hasPlayed.current) {
      hasPlayed.current = true
      playSiren()
    }
    if (!incomingAlert) {
      hasPlayed.current = false
    }
  }, [incomingAlert])

  if (!incomingAlert) return null

  const senderFirstName = incomingAlert.senderName.split(' ')[0]

  function handleAcknowledge() {
    acknowledge.mutate(incomingAlert!.alertId, {
      onSettled: () => dismissAlert(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 safe-top safe-bottom"
      style={{ background: 'rgba(70,0,0,0.97)' }}
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Pulsing ring around siren */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              background: 'rgba(239,68,68,0.25)',
              animation: 'sos-pulse 1s ease-in-out infinite',
            }}
          />
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{ background: 'rgba(239,68,68,0.25)' }}
          >
            🚨
          </div>
        </div>

        {/* "EMERGENCY ALERT" */}
        <p
          className="text-white text-center font-extrabold tracking-widest uppercase"
          style={{ fontSize: 22 }}
        >
          SOS ALERT
        </p>

        {/* "From X" */}
        <p className="text-white/75 text-base font-normal">From {senderFirstName}</p>

        {/* Message bubble */}
        {incomingAlert.message && (
          <div className="bg-white rounded-xl px-4 py-4 w-full text-left">
            <p className="text-gray-900 font-medium leading-snug" style={{ fontSize: 15 }}>
              {incomingAlert.message}
            </p>
            <p className="text-gray-400 text-xs mt-2">{formatTimeAgo(incomingAlert.sentAt)}</p>
          </div>
        )}

        <div className="flex-1" style={{ maxHeight: 40 }} />

        {/* Acknowledge button */}
        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={acknowledge.isPending}
          className="w-full py-4 rounded-2xl font-extrabold disabled:opacity-70 transition-opacity"
          style={{ background: '#fff', color: '#b40000', fontSize: 17, letterSpacing: '0.02em' }}
        >
          {acknowledge.isPending ? 'Acknowledging…' : 'Acknowledge'}
        </button>

        {/* Footer note */}
        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {senderFirstName} will see when you acknowledge
        </p>

        {/* Dismiss without ack */}
        <button
          type="button"
          onClick={dismissAlert}
          className="text-xs underline underline-offset-2"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Dismiss without acknowledging
        </button>
      </div>

      <style>{`
        @keyframes sos-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
