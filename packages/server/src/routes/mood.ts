import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import {
  logMoodSchema,
  updateMoodSchema,
  createCustomActivitySchema,
  updateCustomActivitySchema,
} from '@tracker/shared'

export const moodRouter = Router()
moodRouter.use(authMiddleware)

// GET /api/mood?babyId=&limit=
moodRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const limit = Math.min(Number(req.query['limit'] ?? 30), 100)

  const logs = await prisma.moodLog.findMany({
    where: { babyId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    include: { customActivity: true },
  })

  res.json({ data: logs, error: null })
})

// POST /api/mood
moodRouter.post('/', async (req, res) => {
  const parsed = logMoodSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const activeEpisode = await prisma.sicknessEpisode.findFirst({
    where: { babyId: parsed.data.babyId, endedAt: null },
    select: { id: true },
  })

  const log = await prisma.moodLog.create({
    data: {
      babyId: parsed.data.babyId,
      loggedById: req.user!.userId,
      mood: parsed.data.mood ?? null,
      qualifier: parsed.data.qualifier ?? null,
      customActivityId: parsed.data.customActivityId ?? null,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      notes: parsed.data.notes,
      sicknessEpisodeId: activeEpisode?.id ?? null,
    },
    include: { customActivity: true },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('mood:created', { babyId: log.babyId })

  res.status(201).json({ data: log, error: null })
})

// Custom activity routes — registered before /:id to avoid param collision

// GET /api/mood/activities?babyId=
moodRouter.get('/activities', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const activities = await prisma.customActivity.findMany({
    where: { babyId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  res.json({ data: activities, error: null })
})

// POST /api/mood/activities
moodRouter.post('/activities', async (req, res) => {
  const parsed = createCustomActivitySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const existing = await prisma.customActivity.findUnique({
    where: { babyId_name: { babyId: parsed.data.babyId, name: parsed.data.name } },
  })
  if (existing) { res.status(409).json({ data: null, error: 'Activity with this name already exists' }); return }

  const activity = await prisma.customActivity.create({
    data: {
      babyId: parsed.data.babyId,
      name: parsed.data.name,
      emoji: parsed.data.emoji,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${activity.babyId}`).emit('mood:activities:updated', { babyId: activity.babyId })

  res.status(201).json({ data: activity, error: null })
})

// PATCH /api/mood/activities/:id
moodRouter.patch('/activities/:id', async (req, res) => {
  const activity = await prisma.customActivity.findUnique({ where: { id: req.params['id'] } })
  if (!activity) { res.status(404).json({ data: null, error: 'Activity not found' }); return }

  const parsed = updateCustomActivitySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const updated = await prisma.customActivity.update({
    where: { id: activity.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.emoji !== undefined && { emoji: parsed.data.emoji }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${updated.babyId}`).emit('mood:activities:updated', { babyId: updated.babyId })

  res.json({ data: updated, error: null })
})

// DELETE /api/mood/activities/:id
moodRouter.delete('/activities/:id', async (req, res) => {
  const activity = await prisma.customActivity.findUnique({ where: { id: req.params['id'] } })
  if (!activity) { res.status(404).json({ data: null, error: 'Activity not found' }); return }

  await prisma.customActivity.delete({ where: { id: activity.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${activity.babyId}`).emit('mood:activities:updated', { babyId: activity.babyId })

  res.json({ data: { id: activity.id }, error: null })
})

// PATCH /api/mood/:id
moodRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.moodLog.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Log not found' }); return }

  const parsed = updateMoodSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const log = await prisma.moodLog.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.mood !== undefined && { mood: parsed.data.mood }),
      ...(parsed.data.qualifier !== undefined && { qualifier: parsed.data.qualifier }),
      ...(parsed.data.customActivityId !== undefined && { customActivityId: parsed.data.customActivityId }),
      ...(parsed.data.occurredAt !== undefined && { occurredAt: new Date(parsed.data.occurredAt) }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
    include: { customActivity: true },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('mood:updated', { babyId: log.babyId })

  res.json({ data: log, error: null })
})

// DELETE /api/mood/:id
moodRouter.delete('/:id', async (req, res) => {
  const log = await prisma.moodLog.findUnique({ where: { id: req.params['id'] } })
  if (!log) { res.status(404).json({ data: null, error: 'Log not found' }); return }

  await prisma.moodLog.delete({ where: { id: log.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${log.babyId}`).emit('mood:deleted', { babyId: log.babyId })

  res.json({ data: { id: log.id }, error: null })
})
