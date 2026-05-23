import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  platform: z.enum(['ios', 'android', 'other']).optional(),
})

router.post('/subscribe', authMiddleware, async (req, res) => {
  const parsed = SubscribeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.json({ data: null, error: 'Invalid subscription payload' })
  }

  const { endpoint, keys, platform } = parsed.data
  const userId = req.user!.userId

  // Remove any stale endpoints for this user before registering the new one.
  // When Chrome unsubscribes and resubscribes it generates a new endpoint each
  // time, so without this we accumulate expired rows that will 410 on every push.
  await prisma.pushSubscription.deleteMany({
    where: { userId, NOT: { endpoint } },
  })

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, platform: platform ?? 'other' },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, platform: platform ?? 'other' },
  })

  res.json({ data: { ok: true }, error: null })
})

router.delete('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string }
  if (!endpoint) return res.json({ data: null, error: 'Missing endpoint' })

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.user!.userId },
  })

  res.json({ data: { ok: true }, error: null })
})

export default router
