import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { startTummyTimeSchema, endTummyTimeSchema, updateTummyTimeSchema } from '@tracker/shared'

export const tummyTimeRouter = Router()
tummyTimeRouter.use(authMiddleware)

// GET /api/tummy-time?babyId=&limit=
tummyTimeRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 20), 100)

  const logs = await prisma.tummyTimeLog.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/tummy-time/start
tummyTimeRouter.post('/start', async (req, res) => {
  const parsed = startTummyTimeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  // Cancel any active session before starting a new one
  const active = await prisma.tummyTimeLog.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
  })
  if (active) {
    await prisma.tummyTimeLog.delete({ where: { id: active.id } })
  }

  const log = await prisma.tummyTimeLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('tummytime:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/tummy-time/:id/end
tummyTimeRouter.patch('/:id/end', async (req, res) => {
  const existing = await prisma.tummyTimeLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Session not found' }); return }
  if (existing.endedAt) { res.status(400).json({ data: null, error: 'Session already ended' }); return }

  const parsed = endTummyTimeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date()
  const durationSec = Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 1000)

  const log = await prisma.tummyTimeLog.update({
    where: { id: existing.id },
    data: { endedAt, durationSec, notes: parsed.data.notes },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('tummytime:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// PATCH /api/tummy-time/:id — edit a completed log
tummyTimeRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.tummyTimeLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Session not found' }); return }

  const parsed = updateTummyTimeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { startedAt, endedAt, notes } = parsed.data
  const newStart = startedAt ? new Date(startedAt) : existing.startedAt
  const newEnd = endedAt !== undefined
    ? (endedAt ? new Date(endedAt) : null)
    : existing.endedAt
  const durationSec = newEnd
    ? Math.round((newEnd.getTime() - newStart.getTime()) / 1000)
    : null

  const log = await prisma.tummyTimeLog.update({
    where: { id: existing.id },
    data: {
      ...(startedAt !== undefined && { startedAt: newStart }),
      ...(endedAt !== undefined && { endedAt: newEnd }),
      ...(durationSec !== null && { durationSec }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('tummytime:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/tummy-time/:id
tummyTimeRouter.delete('/:id', async (req, res) => {
  const log = await prisma.tummyTimeLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Session not found' }); return }

  await prisma.tummyTimeLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('tummytime:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
