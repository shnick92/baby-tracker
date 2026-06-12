import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// Allow VitePWA's autoUpdate to activate the new SW immediately without
// waiting for all tabs to close.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

// Offline read access: cache GET /api/* responses, network-first with a
// 48h cached fallback. Auth and file-download routes are excluded — auth
// responses must never be stale and exports are large one-shot downloads.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth') &&
    !url.pathname.startsWith('/api/export'),
  new NetworkFirst({
    cacheName: 'api-reads',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 48 * 3600 })],
  }),
)

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
    ...(isSOS && { vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500] }),
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
