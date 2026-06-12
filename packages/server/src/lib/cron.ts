import cron from 'node-cron'
import type { Server } from 'socket.io'
import { prisma } from './prisma'
import { sendPush } from './push'
import { generateWeeklySummaryText } from '../services/ai'
import { isSeedGuarded } from './aiGuards'

type WebPushError = Error & { statusCode?: number }

export async function runWakeWindowCheck(): Promise<void> {
  const babies = await prisma.baby.findMany({
    include: {
      parents: { include: { user: { include: { pushSubscriptions: true } } } },
      sleepSettings: true,
      notificationSettings: true,
      sleepLogs: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  })

  const now = Date.now()

  for (const baby of babies) {
    // Wake window alerts default ON; can be disabled per baby in Settings
    if (baby.notificationSettings?.wakeWindowAlertEnabled === false) {
      console.log(`[cron] baby ${baby.id}: wake window alerts disabled, skipping`)
      continue
    }

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

async function runWeeklySummaries(): Promise<void> {
  if (isSeedGuarded()) {
    console.log('[cron] SEED_DATA_GUARD active — skipping weekly summaries')
    return
  }

  const babies = await prisma.baby.findMany({
    select: { id: true, notificationSettings: { select: { weeklyDigestEnabled: true } } },
  })
  for (const baby of babies) {
    // Weekly digest defaults ON; can be disabled per baby in Settings
    if (baby.notificationSettings?.weeklyDigestEnabled === false) {
      console.log(`[cron] baby ${baby.id}: weekly digest disabled, skipping`)
      continue
    }
    try {
      const { content, totalFeeds, totalSleepMin, totalDiapers, weightChangeOz } =
        await generateWeeklySummaryText(baby.id)

      const weekOf = new Date()
      weekOf.setHours(0, 0, 0, 0)
      // Set to Monday of the current week
      const day = weekOf.getDay()
      weekOf.setDate(weekOf.getDate() - ((day + 6) % 7))

      await prisma.aIWeeklySummary.create({
        data: {
          babyId: baby.id,
          weekOf,
          content,
          totalFeeds,
          totalSleepMin,
          totalDiapers,
          weightChangeOz,
        },
      })
      console.log(`[cron] weekly summary generated for baby ${baby.id}`)
    } catch (err) {
      console.error(`[cron] weekly summary failed for baby ${baby.id}:`, err)
    }
  }
}

async function runDailyCostCheck(io: Server): Promise<void> {
  const alertThreshold = parseFloat(process.env['AI_DAILY_COST_ALERT_USD'] ?? '1.00')
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const logs = await prisma.aIUsageLog.findMany({
    where: { calledAt: { gte: dayStart } },
    select: { costUsdEstimate: true, babyId: true },
  })

  const todayCostUsd = logs.reduce((s, l) => s + l.costUsdEstimate, 0)
  console.log(`[cron] daily AI cost check: $${todayCostUsd.toFixed(4)} (threshold $${alertThreshold})`)

  if (todayCostUsd >= alertThreshold) {
    console.warn(`[cron] AI daily cost threshold exceeded: $${todayCostUsd.toFixed(4)}`)
    // Emit to all baby rooms that had usage today
    const babyIds = [...new Set(logs.map((l) => l.babyId).filter(Boolean))]
    for (const babyId of babyIds) {
      io.to(`family:${babyId}`).emit('alert:ai-cost', {
        todayCostUsd: Math.round(todayCostUsd * 10000) / 10000,
        thresholdUsd: alertThreshold,
      })
    }
  }
}

export async function runFeedingReminderCheck(): Promise<void> {
  const babies = await prisma.baby.findMany({
    where: { notificationSettings: { feedingReminderEnabled: true } },
    include: {
      parents: { include: { user: { include: { pushSubscriptions: true } } } },
      notificationSettings: true,
      feedingLogs: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  })

  const now = Date.now()

  for (const baby of babies) {
    const settings = baby.notificationSettings!
    const lastFeed = baby.feedingLogs[0]
    if (!lastFeed) {
      console.log(`[cron] baby ${baby.id}: no feedings logged, skipping reminder`)
      continue
    }

    const sinceMs = now - new Date(lastFeed.startedAt).getTime()
    const intervalMs = settings.feedingReminderMinutes * 60 * 1000
    if (sinceMs < intervalMs) continue

    // Cooldown: one reminder per interval
    if (settings.lastFeedingNotifiedAt) {
      const sinceNotifyMs = now - new Date(settings.lastFeedingNotifiedAt).getTime()
      if (sinceNotifyMs < intervalMs) continue
    }

    const sinceMin = Math.round(sinceMs / 60000)
    const h = Math.floor(sinceMin / 60)
    const m = sinceMin % 60
    const ago = h > 0 ? `${h}h ${m}m` : `${m}m`

    const subs = baby.parents.flatMap((bu) => bu.user.pushSubscriptions)
    console.log(`[cron] baby ${baby.id}: feeding reminder — last fed ${ago} ago, ${subs.length} subscription(s)`)

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPush(sub, {
          title: 'Feeding reminder',
          body: `No feeding logged in ${ago}. Time for a feed?`,
        }),
      ),
    )

    await Promise.all(results.map(async (r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as WebPushError
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: subs[i].endpoint } }).catch(() => {})
        }
      }
    }))

    const anySent = results.some((r) => r.status === 'fulfilled')
    if (anySent || subs.length === 0) {
      await prisma.notificationSettings.update({
        where: { babyId: baby.id },
        data: { lastFeedingNotifiedAt: new Date() },
      })
    }
  }
}

export function startCronJobs(io: Server): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runWakeWindowCheck()
    } catch (err) {
      console.error('[cron] wake-window check failed:', err)
    }
    try {
      await runFeedingReminderCheck()
    } catch (err) {
      console.error('[cron] feeding reminder check failed:', err)
    }
  })

  // Weekly summary only runs in production to avoid accidental Anthropic API calls in dev
  if (process.env.NODE_ENV === 'production') {
    // Every Sunday at 8:00 PM local server time
    cron.schedule('0 20 * * 0', async () => {
      try {
        await runWeeklySummaries()
      } catch (err) {
        console.error('[cron] weekly summary job failed:', err)
      }
    })
  } else {
    console.log('[cron] weekly summary job disabled in non-production environment')
  }

  // Daily cost check at 11:00 PM — only meaningful if AI is configured
  cron.schedule('0 23 * * *', async () => {
    try {
      await runDailyCostCheck(io)
    } catch (err) {
      console.error('[cron] daily cost check failed:', err)
    }
  })
}
