import { useEffect } from 'react'
import { api } from '@lib/axios'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    if (!('Notification' in window)) {
      console.warn('[push] Notification API not available')
      return
    }
    if (!('serviceWorker' in navigator)) {
      console.warn('[push] Service Worker API not available')
      return
    }
    if (Notification.permission === 'denied') {
      console.warn('[push] Notification permission denied')
      return
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!vapidKey) {
      console.warn('[push] VITE_VAPID_PUBLIC_KEY not set — push registration skipped')
      return
    }

    console.log('[push] requesting notification permission, current:', Notification.permission)

    Notification.requestPermission().then((permission) => {
      console.log('[push] permission result:', permission)
      if (permission !== 'granted') return

      console.log('[push] waiting for service worker...')
      navigator.serviceWorker.ready.then((reg) => {
        console.log('[push] SW ready, checking existing subscription...')
        reg.pushManager.getSubscription().then(async (existing) => {
          try {
            const sub = existing ?? (await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            }))
            console.log('[push] subscription obtained, registering with server...')
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
            const isAndroid = /Android/.test(navigator.userAgent)
            const platform: 'ios' | 'android' | 'other' = isIOS ? 'ios' : isAndroid ? 'android' : 'other'
            await api.post('/api/push/subscribe', { ...sub.toJSON(), platform })
            console.log('[push] registered successfully')
          } catch (err) {
            console.error('[push] subscription or registration failed:', err)
          }
        })
      }).catch((err) => {
        console.error('[push] SW ready failed:', err)
      })
    })
  }, [enabled])
}

// Unsubscribes this device from push and removes the registration server-side.
// Used by the Settings push toggle.
export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await api.delete('/api/push/subscribe', { data: { endpoint: sub.endpoint } }).catch(() => null)
    await sub.unsubscribe()
    console.log('[push] unsubscribed')
  } catch (err) {
    console.error('[push] unsubscribe failed:', err)
  }
}
