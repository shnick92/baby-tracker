import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { CDC_MILESTONES } from '@tracker/shared'
import { z } from 'zod'

export const milestonesRouter = Router()
milestonesRouter.use(authMiddleware)

const achieveSchema = z.object({
  achievedAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

// GET /api/milestones?babyId=
// Auto-seeds CDC milestones for this baby if none exist yet.
milestonesRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const existing = await prisma.milestone.findMany({ where: { babyId } })

  if (existing.length === 0) {
    await prisma.milestone.createMany({
      data: CDC_MILESTONES.map((m) => ({
        babyId,
        category: m.category,
        label: m.label,
      })),
    })
    const seeded = await prisma.milestone.findMany({
      where: { babyId },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    })
    res.json({ data: seeded, error: null })
    return
  }

  res.json({ data: existing, error: null })
})

// PATCH /api/milestones/:id — mark achieved or add notes (or un-achieve by setting achievedAt to null)
milestonesRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.milestone.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Milestone not found' }); return }

  const parsed = achieveSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { achievedAt, notes } = parsed.data

  const milestone = await prisma.milestone.update({
    where: { id: existing.id },
    data: {
      ...(achievedAt !== undefined && { achievedAt: achievedAt ? new Date(achievedAt) : null }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${milestone.babyId}`).emit('milestone:updated', { babyId: milestone.babyId })

  res.json({ data: milestone, error: null })
})

// POST /api/milestones — add a custom milestone
milestonesRouter.post('/', async (req, res) => {
  const babyId = req.body.babyId as string
  const label = req.body.label as string
  if (!babyId || !label) { res.status(400).json({ data: null, error: 'babyId and label required' }); return }

  const milestone = await prisma.milestone.create({
    data: {
      babyId,
      category: 'CUSTOM',
      label: label.trim().slice(0, 200),
      notes: req.body.notes ?? undefined,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${milestone.babyId}`).emit('milestone:created', { babyId: milestone.babyId })

  res.status(201).json({ data: milestone, error: null })
})

// DELETE /api/milestones/:id — custom milestones only; CDC milestones cannot be deleted
milestonesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.milestone.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Milestone not found' }); return }
  if (existing.category !== 'CUSTOM') {
    res.status(400).json({ data: null, error: 'Cannot delete a CDC milestone' })
    return
  }

  await prisma.milestone.delete({ where: { id: existing.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('milestone:deleted', { babyId: existing.babyId })

  res.json({ data: { id: existing.id }, error: null })
})
