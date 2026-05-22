import { useState, useEffect } from 'react'
import { useSosStore } from '@stores/sosStore'
import { SOSConfirmSheet } from './SOSConfirmSheet'

const BellIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
)

type Props = {
  babyId: string
  variant?: 'icon' | 'full'
}

export function SOSButton({ babyId, variant = 'icon' }: Props) {
  const cooldownUntil = useSosStore((s) => s.cooldownUntil)
  const [showSheet, setShowSheet] = useState(false)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!cooldownUntil) return
    const update = () => {
      const rem = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
      setRemaining(rem)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  const onCooldown = !!cooldownUntil && remaining > 0

  if (variant === 'full') {
    return (
      <>
        <button
          type="button"
          disabled={onCooldown}
          onClick={() => !onCooldown && setShowSheet(true)}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
            onCooldown
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white active:bg-red-600'
          }`}
        >
          <BellIcon />
          {onCooldown ? `SOS (wait ${remaining}s)` : 'SOS Alert'}
        </button>
        {showSheet && <SOSConfirmSheet babyId={babyId} onClose={() => setShowSheet(false)} />}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={onCooldown}
        onClick={() => !onCooldown && setShowSheet(true)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          onCooldown
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white active:bg-red-600'
        }`}
        title={onCooldown ? `SOS cooldown: ${remaining}s` : 'Send SOS alert to partner'}
      >
        <BellIcon />
        {onCooldown ? remaining : 'SOS'}
      </button>
      {showSheet && <SOSConfirmSheet babyId={babyId} onClose={() => setShowSheet(false)} />}
    </>
  )
}
