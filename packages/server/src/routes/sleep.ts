import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { startSleepSchema, endSleepSchema, updateSleepSchema } from '@tracker/shared'

export const sleepRouter = Router()
sleepRouter.use(authMiddleware)

// GET /api/sleep?babyId=&limit=
sleepRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 20), 100)

  const logs = await prisma.sleepLog.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/sleep/start
sleepRouter.post('/start', async (req, res) => {
  const parsed = startSleepSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const activeEpisode = await prisma.sicknessEpisode.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
    select: { id: true },
  })

  const log = await prisma.sleepLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      type: parsed.data.type,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
      sicknessEpisodeId: activeEpisode?.id ?? null,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('sleep:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/sleep/:id/end
sleepRouter.patch('/:id/end', async (req, res) => {
  const existing = await prisma.sleepLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Sleep log not found' }); return }
  if (existing.endedAt) { res.status(400).json({ data: null, error: 'Sleep already ended' }); return }

  const parsed = endSleepSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date()

  const log = await prisma.sleepLog.update({
    where: { id: existing.id },
    data: { endedAt },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('sleep:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// PATCH /api/sleep/:id — edit a sleep log
sleepRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.sleepLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Sleep log not found' }); return }

  const parsed = updateSleepSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { type, startedAt, endedAt, notes } = parsed.data

  const log = await prisma.sleepLog.update({
    where: { id: existing.id },
    data: {
      ...(type !== undefined && { type }),
      ...(startedAt !== undefined && { startedAt: new Date(startedAt) }),
      ...(endedAt !== undefined && { endedAt: endedAt ? new Date(endedAt) : null }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('sleep:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/sleep/:id
sleepRouter.delete('/:id', async (req, res) => {
  const log = await prisma.sleepLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Sleep log not found' }); return }

  await prisma.sleepLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('sleep:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
