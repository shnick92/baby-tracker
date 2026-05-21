import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { startBreastFeedSchema, endFeedSchema, logBottleSchema, logPumpSchema, updateFeedingSchema } from '@tracker/shared'

export const feedingRouter = Router()
feedingRouter.use(authMiddleware)

// GET /api/feeding?babyId=&limit=
feedingRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 50), 100)

  const logs = await prisma.feedingLog.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/feeding/start — start a timed breast feed
feedingRouter.post('/start', async (req, res) => {
  const parsed = startBreastFeedSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.feedingLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      type: parsed.data.type,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/feeding/:id/end — stop an active breast feed
feedingRouter.patch('/:id/end', async (req, res) => {
  const existing = await prisma.feedingLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Feeding log not found' }); return }
  if (existing.endedAt) { res.status(400).json({ data: null, error: 'Feed already ended' }); return }

  const parsed = endFeedSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date()
  const durationSec = Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 1000)

  const log = await prisma.feedingLog.update({
    where: { id: existing.id },
    data: { endedAt, durationSec },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// POST /api/feeding/bottle — log a completed bottle feed
feedingRouter.post('/bottle', async (req, res) => {
  const parsed = logBottleSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.feedingLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      type: 'BOTTLE',
      startedAt: parsed.data.fedAt ? new Date(parsed.data.fedAt) : new Date(),
      volumeOz: parsed.data.volumeOz,
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// POST /api/feeding/pump — log a completed pump session
feedingRouter.post('/pump', async (req, res) => {
  const parsed = logPumpSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.feedingLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      type: 'PUMP',
      startedAt: parsed.data.fedAt ? new Date(parsed.data.fedAt) : new Date(),
      volumeOz: parsed.data.volumeOz,
      durationSec: parsed.data.durationSec,
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/feeding/:id — edit a completed feeding log
feedingRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.feedingLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Feeding log not found' }); return }

  const parsed = updateFeedingSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { type, startedAt, endedAt, volumeOz, notes } = parsed.data

  const newStartedAt = startedAt ? new Date(startedAt) : existing.startedAt
  const newEndedAt = endedAt !== undefined ? (endedAt ? new Date(endedAt) : null) : existing.endedAt
  const newType = type ?? existing.type

  let durationSec = existing.durationSec
  if (newEndedAt && (newType === 'BREAST_LEFT' || newType === 'BREAST_RIGHT')) {
    durationSec = Math.round((newEndedAt.getTime() - newStartedAt.getTime()) / 1000)
  }

  const log = await prisma.feedingLog.update({
    where: { id: existing.id },
    data: {
      ...(type !== undefined && { type }),
      ...(startedAt !== undefined && { startedAt: newStartedAt }),
      ...(endedAt !== undefined && { endedAt: newEndedAt }),
      ...(volumeOz !== undefined && { volumeOz }),
      ...(notes !== undefined && { notes }),
      durationSec,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/feeding/:id
feedingRouter.delete('/:id', async (req, res) => {
  const log = await prisma.feedingLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Feeding log not found' }); return }

  await prisma.feedingLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('feeding:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
