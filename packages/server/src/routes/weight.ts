import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logWeightSchema, updateWeightSchema } from '@tracker/shared'

export const weightRouter = Router()
weightRouter.use(authMiddleware)

// GET /api/weight?babyId=&limit=
weightRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 50), 200)

  const logs = await prisma.weightLog.findMany({
    where: { babyId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/weight
weightRouter.post('/', async (req, res) => {
  const parsed = logWeightSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.weightLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      lbs: parsed.data.lbs,
      oz: parsed.data.oz,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('weight:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/weight/:id
weightRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.weightLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Weight log not found' }); return }

  const parsed = updateWeightSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { lbs, oz, recordedAt, notes } = parsed.data

  const log = await prisma.weightLog.update({
    where: { id: existing.id },
    data: {
      ...(lbs !== undefined && { lbs }),
      ...(oz !== undefined && { oz }),
      ...(recordedAt !== undefined && { recordedAt: new Date(recordedAt) }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('weight:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/weight/:id
weightRouter.delete('/:id', async (req, res) => {
  const log = await prisma.weightLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Weight log not found' }); return }

  await prisma.weightLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('weight:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
