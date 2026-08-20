import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { startContractionSchema, endContractionSchema } from '@tracker/shared'

export const contractionRouter = Router()
contractionRouter.use(authMiddleware)

// GET /api/contractions?babyId=&limit=
contractionRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 50), 200)

  const logs = await prisma.contractionLog.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/contractions/start
contractionRouter.post('/start', async (req, res) => {
  const parsed = startContractionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  // Cancel any active contraction before starting a new one
  const active = await prisma.contractionLog.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
  })
  if (active) {
    await prisma.contractionLog.delete({ where: { id: active.id } })
  }

  const log = await prisma.contractionLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('contraction:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/contractions/:id/end
contractionRouter.patch('/:id/end', async (req, res) => {
  const existing = await prisma.contractionLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Contraction not found' }); return }
  if (existing.endedAt) { res.status(400).json({ data: null, error: 'Contraction already ended' }); return }

  const parsed = endContractionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date()
  const durationSec = Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 1000)

  const log = await prisma.contractionLog.update({
    where: { id: existing.id },
    data: { endedAt, durationSec },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('contraction:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/contractions/:id
contractionRouter.delete('/:id', async (req, res) => {
  const log = await prisma.contractionLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Contraction not found' }); return }

  await prisma.contractionLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('contraction:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
