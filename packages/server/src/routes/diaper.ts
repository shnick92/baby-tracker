import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { diaperListQuerySchema, logDiaperSchema, updateDiaperSchema } from '@tracker/shared'

export const diaperRouter = Router()
diaperRouter.use(authMiddleware)

// GET /api/diaper?babyId=&since=&limit=
diaperRouter.get('/', async (req, res) => {
  const parsed = diaperListQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid query' })
    return
  }

  const { babyId, since, limit } = parsed.data

  const logs = await prisma.diaperLog.findMany({
    where: { babyId, ...(since && { occurredAt: { gte: new Date(since) } }) },
    orderBy: { occurredAt: 'desc' },
    // With `since` the window bounds the result; otherwise keep the short recent list
    take: limit ?? (since ? 500 : 20),
  })

  res.json({ data: logs, error: null })
})

// POST /api/diaper
diaperRouter.post('/', async (req, res) => {
  const parsed = logDiaperSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const activeEpisode = await prisma.sicknessEpisode.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
    select: { id: true },
  })

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
      sicknessEpisodeId: activeEpisode?.id ?? null,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('diaper:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/diaper/:id — edit a diaper log
diaperRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.diaperLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Diaper log not found' }); return }

  const parsed = updateDiaperSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { type, color, consistency, customConsistency, occurredAt, notes } = parsed.data

  const log = await prisma.diaperLog.update({
    where: { id: existing.id },
    data: {
      ...(type !== undefined && { type }),
      ...(color !== undefined && { color }),
      ...(consistency !== undefined && { consistency }),
      ...(customConsistency !== undefined && { customConsistency }),
      ...(occurredAt !== undefined && { occurredAt: new Date(occurredAt) }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('diaper:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
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
