import { Router } from 'express'
import { z } from 'zod'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { sendPush } from '../lib/push'
import { calcCooldownRemainingSec } from '../services/alerts'

const router = Router()

const SosSchema = z.object({
  babyId: z.string().min(1, 'Baby ID is required'),
  message: z.string().max(200, 'Message must be 200 characters or less').optional(),
})

type WebPushError = Error & { statusCode?: number }

router.post('/sos', authMiddleware, async (req, res) => {
  const parsed = SosSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: parsed.error.errors[0].message })
  }

  const { babyId, message } = parsed.data
  const senderId = req.user!.userId

  // Verify sender is a parent of this baby
  const senderMembership = await prisma.babyUser.findUnique({
    where: { babyId_userId: { babyId, userId: senderId } },
    include: { user: true },
  })
  if (!senderMembership) {
    return res.status(403).json({ data: null, error: 'Forbidden' })
  }

  // Cooldown: block if a recent alert was sent by this user in the last 60 s
  const recentAlert = await prisma.emergencyAlert.findFirst({
    where: {
      babyId,
      sentById: senderId,
      sentAt: { gte: new Date(Date.now() - 60_000) },
    },
  })
  if (recentAlert) {
    const remainingSec = calcCooldownRemainingSec(new Date(recentAlert.sentAt))
    return res.status(429).json({
      data: null,
      error: `Please wait ${remainingSec}s before sending another SOS`,
    })
  }

  // Find recipient (other parent)
  const otherParents = await prisma.babyUser.findMany({
    where: { babyId, userId: { not: senderId } },
    include: { user: { include: { pushSubscriptions: true } } },
  })

  if (otherParents.length === 0) {
    return res.status(400).json({ data: null, error: 'No other parent found to notify' })
  }

  const recipient = otherParents[0].user

  const alert = await prisma.emergencyAlert.create({
    data: {
      babyId,
      sentById: senderId,
      sentToId: recipient.id,
      message: message ?? null,
      status: 'SENT',
    },
    include: {
      sentBy: { select: { id: true, name: true } },
      sentTo: { select: { id: true, name: true } },
    },
  })

  // Send push notification to recipient's devices
  const subs = recipient.pushSubscriptions
  const pushPayload = {
    title: '🚨 SOS from ' + senderMembership.user.name.split(' ')[0],
    body: message ?? 'Your partner needs you right now!',
    type: 'emergency-sos',
    tag: 'emergency-alert',
    requireInteraction: true,
    data: { alertId: alert.id },
  }

  const pushResults = await Promise.allSettled(
    subs.map((sub) => sendPush(sub, pushPayload, 'high')),
  )

  // Remove expired subscriptions (410/404)
  await Promise.all(
    pushResults.map(async (r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as WebPushError
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: subs[i].endpoint } }).catch(() => {})
        }
      }
    }),
  )

  // Emit socket event to family room
  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('alert:sos', {
    alertId: alert.id,
    senderId,
    senderName: senderMembership.user.name,
    message: alert.message,
    sentAt: alert.sentAt,
  })

  res.json({ data: { alert }, error: null })
})

router.patch('/:id/acknowledge', authMiddleware, async (req, res) => {
  const { id } = req.params
  const userId = req.user!.userId

  const alert = await prisma.emergencyAlert.findUnique({ where: { id } })
  if (!alert) {
    return res.status(404).json({ data: null, error: 'Alert not found' })
  }
  if (alert.sentToId !== userId) {
    return res.status(403).json({ data: null, error: 'Forbidden' })
  }

  const updated = await prisma.emergencyAlert.update({
    where: { id },
    data: {
      status: 'ACKNOWLEDGED',
      seenAt: alert.seenAt ?? new Date(),
    },
    include: {
      sentBy: { select: { id: true, name: true } },
      sentTo: { select: { id: true, name: true } },
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${alert.babyId}`).emit('alert:acknowledged', { alertId: id, acknowledgedById: userId })

  res.json({ data: { alert: updated }, error: null })
})

router.get('/', authMiddleware, async (req, res) => {
  const { babyId } = req.query as { babyId?: string }
  if (!babyId) {
    return res.status(400).json({ data: null, error: 'babyId is required' })
  }

  const alerts = await prisma.emergencyAlert.findMany({
    where: { babyId },
    orderBy: { sentAt: 'desc' },
    take: 10,
    include: {
      sentBy: { select: { id: true, name: true } },
      sentTo: { select: { id: true, name: true } },
    },
  })

  res.json({ data: { alerts }, error: null })
})

export default router
