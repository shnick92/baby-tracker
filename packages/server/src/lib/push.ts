import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

type PushPayload = {
  title: string
  body: string
  type?: string
  tag?: string
  requireInteraction?: boolean
  data?: Record<string, unknown>
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  urgency: webpush.Urgency = 'normal',
): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { urgency },
  )
}
