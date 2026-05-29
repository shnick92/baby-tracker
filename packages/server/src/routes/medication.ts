import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logMedicationSchema, updateMedicationSchema } from '@tracker/shared'

export const medicationRouter = Router()
medicationRouter.use(authMiddleware)

// GET /api/medication?babyId=&limit=
medicationRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 30), 100)

  const logs = await prisma.medicationLog.findMany({
    where: { babyId },
    orderBy: { givenAt: 'desc' },
    take: limit,
  })

  res.json({ data: logs, error: null })
})

// POST /api/medication
medicationRouter.post('/', async (req, res) => {
  const parsed = logMedicationSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const activeEpisode = await prisma.sicknessEpisode.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
    select: { id: true },
  })

  const log = await prisma.medicationLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      name: parsed.data.name,
      dosageNote: parsed.data.dosageNote,
      givenAt: parsed.data.givenAt ? new Date(parsed.data.givenAt) : new Date(),
      notes: parsed.data.notes,
      sicknessEpisodeId: activeEpisode?.id ?? null,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('medication:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// PATCH /api/medication/:id
medicationRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.medicationLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Medication log not found' }); return }

  const parsed = updateMedicationSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { name, dosageNote, givenAt, notes } = parsed.data

  const log = await prisma.medicationLog.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(dosageNote !== undefined && { dosageNote }),
      ...(givenAt !== undefined && { givenAt: new Date(givenAt) }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('medication:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/medication/:id
medicationRouter.delete('/:id', async (req, res) => {
  const log = await prisma.medicationLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Medication log not found' }); return }

  await prisma.medicationLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('medication:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
