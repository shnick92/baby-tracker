import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logDiaperSchema } from '@tracker/shared'

export const diaperRouter = Router()
diaperRouter.use(authMiddleware)

// GET /api/diaper?babyId=&limit=
diaperRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 20), 100)

  const logs = await prisma.diaperLog.findMany({
    where: { babyId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/diaper
diaperRouter.post('/', async (req, res) => {
  const parsed = logDiaperSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.diaperLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      type: parsed.data.type,
      color: parsed.data.color,
      consistency: parsed.data.consistency,
      customConsistency: parsed.data.customConsistency,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('diaper:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// DELETE /api/diaper/:id
diaperRouter.delete('/:id', async (req, res) => {
  const log = await prisma.diaperLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Diaper log not found' }); return }

  await prisma.diaperLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('diaper:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
