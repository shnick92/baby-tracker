import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logHeightSchema, updateHeightSchema } from '@tracker/shared'

export const heightRouter = Router()
heightRouter.use(authMiddleware)

// GET /api/height?babyId=&limit=
heightRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 50), 200)

  const logs = await prisma.heightLog.findMany({
    where: { babyId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/height
heightRouter.post('/', async (req, res) => {
  const parsed = logHeightSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.heightLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      inches: parsed.data.inches,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('height:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/height/:id
heightRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.heightLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Height log not found' }); return }

  const parsed = updateHeightSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { inches, recordedAt, notes } = parsed.data

  const log = await prisma.heightLog.update({
    where: { id: existing.id },
    data: {
      ...(inches !== undefined && { inches }),
      ...(recordedAt !== undefined && { recordedAt: new Date(recordedAt) }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('height:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/height/:id
heightRouter.delete('/:id', async (req, res) => {
  const log = await prisma.heightLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Height log not found' }); return }

  await prisma.heightLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('height:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
