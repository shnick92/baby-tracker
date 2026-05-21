import cron from 'node-cron'
import { prisma } from './prisma'
import { sendPush } from './push'

type WebPushError = Error & { statusCode?: number }

export async function runWakeWindowCheck(): Promise<void> {
  const babies = await prisma.baby.findMany({
    include: {
      parents: { include: { user: { include: { pushSubscriptions: true } } } },
      sleepSettings: true,
      sleepLogs: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  })

  const now = Date.now()

  for (const baby of babies) {
    const lastSleep = baby.sleepLogs[0]
    if (!lastSleep || lastSleep.endedAt === null) {
      console.log(`[cron] baby ${baby.id}: skipping — no completed sleep log`)
      continue
    }

    const awakeMs = now - new Date(lastSleep.endedAt).getTime()
    const awakeMin = Math.round(awakeMs / 60000)
    const settings = baby.sleepSettings
    const maxMs = (settings?.wakeWindowMaxMinutes ?? 120) * 60 * 1000

    console.log(`[cron] baby ${baby.id}: awake ${awakeMin}m, window max ${settings?.wakeWindowMaxMinutes ?? 120}m`)

    if (awakeMs < maxMs) {
      console.log(`[cron] baby ${baby.id}: within window, skipping`)
      continue
    }

    // Cooldown: skip if we already sent a notification in the last wakeWindowMax period
    if (settings?.lastWakeNotifiedAt) {
      const lastNotifyMs = now - new Date(settings.lastWakeNotifiedAt).getTime()
      if (lastNotifyMs < maxMs) {
        console.log(`[cron] baby ${baby.id}: cooldown active, skipping`)
        continue
      }
    }

    const subs = baby.parents.flatMap((bu) => bu.user.pushSubscriptions)
    console.log(`[cron] baby ${baby.id}: sending push to ${subs.length} subscription(s)`)

    const payload = {
      title: 'Wake window alert',
      body: `Baby has been awake for ${awakeMin} min. Time for a nap?`,
    }

    const results = await Promise.allSettled(subs.map((sub) => sendPush(sub, payload)))

    // Log results and auto-delete expired/unsubscribed endpoints (410/404)
    await Promise.all(results.map(async (r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`[cron] push ${i} delivered`)
      } else {
        const err = r.reason as WebPushError
        const code = err.statusCode
        console.error(`[cron] push ${i} failed (${code ?? 'unknown'}): ${err.message}`)
        if (code === 410 || code === 404) {
          console.log(`[cron] push ${i}: removing expired subscription ${subs[i].endpoint.slice(-20)}`)
          await prisma.pushSubscription.delete({ where: { endpoint: subs[i].endpoint } }).catch(() => {})
        }
      }
    }))

    const anySent = results.some((r) => r.status === 'fulfilled')
    if (anySent || subs.length === 0) {
      await prisma.sleepSettings.upsert({
        where: { babyId: baby.id },
        create: { babyId: baby.id, lastWakeNotifiedAt: new Date() },
        update: { lastWakeNotifiedAt: new Date() },
      })
    }
  }
}

export function startCronJobs(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runWakeWindowCheck()
    } catch (err) {
      console.error('[cron] wake-window check failed:', err)
    }
  })
}
