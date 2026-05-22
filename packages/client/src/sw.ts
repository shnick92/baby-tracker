import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = event.data.json() as {
    title: string
    body: string
    type?: string
    tag?: string
    requireInteraction?: boolean
    data?: Record<string, unknown>
  }

  const isSOS = payload.type === 'emergency-sos'

  const notificationOptions: NotificationOptions = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag ?? 'default',
    renotify: true,
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data ?? {},
    ...(isSOS && { vibrate: [300, 100, 300, 100, 300] }),
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title, notificationOptions)

      // Notify any open app clients so they can play audio
      if (isSOS) {
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          client.postMessage({ type: 'sos', alertId: payload.data?.alertId })
        }
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { alertId?: string }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const target = event.notification.tag === 'emergency-alert' ? '/' : '/sleep'
      const focused = clients.find((c) => c.url.includes(target))
      if (focused) return focused.focus()
      return self.clients.openWindow(
        data.alertId ? `/?sos=${data.alertId}` : target,
      )
    }),
  )
})
