import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { createVisitorSlotSchema, updateVisitorSlotSchema } from '@tracker/shared'

export const visitorRouter = Router()
visitorRouter.use(authMiddleware)

// GET /api/visitors?babyId=&from=&to=
visitorRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const from = req.query['from'] ? (req.query['from'] as string).slice(0, 10) : undefined
  const to = req.query['to'] ? (req.query['to'] as string).slice(0, 10) : undefined

  const slots = await prisma.visitorSlot.findMany({
    where: {
      babyId,
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    orderBy: [{ date: 'asc' }, { startTime: { sort: 'asc', nulls: 'last' } }],
  })

  res.json({ data: slots, error: null })
})

// POST /api/visitors?babyId=
visitorRouter.post('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const parsed = createVisitorSlotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const slot = await prisma.visitorSlot.create({
    data: {
      babyId,
      name: parsed.data.name,
      date: parsed.data.date,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('visitors:updated', { babyId })

  res.status(201).json({ data: slot, error: null })
})

// PATCH /api/visitors/:id
visitorRouter.patch('/:id', async (req, res) => {
  const parsed = updateVisitorSlotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const existing = await prisma.visitorSlot.findUnique({ where: { id: req.params['id'] } })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Visitor slot not found' })
    return
  }

  const slot = await prisma.visitorSlot.update({
    where: { id: req.params['id'] },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.date !== undefined ? { date: parsed.data.date } : {}),
      ...(parsed.data.startTime !== undefined ? { startTime: new Date(parsed.data.startTime) } : {}),
      ...(parsed.data.endTime !== undefined ? { endTime: new Date(parsed.data.endTime) } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('visitors:updated', { babyId: existing.babyId })

  res.json({ data: slot, error: null })
})

// DELETE /api/visitors/:id
visitorRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.visitorSlot.findUnique({ where: { id: req.params['id'] } })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Visitor slot not found' })
    return
  }

  await prisma.visitorSlot.delete({ where: { id: req.params['id'] } })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('visitors:updated', { babyId: existing.babyId })

  res.json({ data: { success: true }, error: null })
})
