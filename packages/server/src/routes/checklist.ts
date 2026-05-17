import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import {
  checklistTypeSchema,
  createChecklistItemSchema,
  toggleChecklistItemSchema,
  updateChecklistItemSchema,
} from '@tracker/shared'

export const checklistRouter = Router()
checklistRouter.use(authMiddleware)

// GET /api/checklist/:type?babyId=
checklistRouter.get('/:type', async (req, res) => {
  const typeResult = checklistTypeSchema.safeParse(req.params['type']?.toUpperCase())
  if (!typeResult.success) {
    res.status(400).json({ data: null, error: 'Invalid checklist type' })
    return
  }
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const checklist = await prisma.checklist.findUnique({
    where: { babyId_type: { babyId, type: typeResult.data } },
    include: { items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
  })

  res.json({ data: checklist, error: null })
})

// POST /api/checklist/:type/items?babyId=
checklistRouter.post('/:type/items', async (req, res) => {
  const typeResult = checklistTypeSchema.safeParse(req.params['type']?.toUpperCase())
  if (!typeResult.success) {
    res.status(400).json({ data: null, error: 'Invalid checklist type' })
    return
  }
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const parsed = createChecklistItemSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const checklist = await prisma.checklist.upsert({
    where: { babyId_type: { babyId, type: typeResult.data } },
    create: { babyId, type: typeResult.data },
    update: {},
  })

  const item = await prisma.checklistItem.create({
    data: { checklistId: checklist.id, ...parsed.data },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('checklist:updated', { type: typeResult.data, babyId })

  res.status(201).json({ data: item, error: null })
})

// PATCH /api/checklist/items/:itemId/toggle
checklistRouter.patch('/items/:itemId/toggle', async (req, res) => {
  const parsed = toggleChecklistItemSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const existing = await prisma.checklistItem.findUnique({
    where: { id: req.params['itemId'] },
    include: { checklist: true },
  })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Item not found' })
    return
  }

  const item = await prisma.checklistItem.update({
    where: { id: req.params['itemId'] },
    data: {
      isChecked: parsed.data.isChecked,
      checkedAt: parsed.data.isChecked ? new Date() : null,
      checkedById: parsed.data.isChecked ? req.user!.userId : null,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.checklist.babyId}`).emit('checklist:updated', {
    type: existing.checklist.type,
    babyId: existing.checklist.babyId,
  })

  res.json({ data: item, error: null })
})

// PATCH /api/checklist/items/:itemId
checklistRouter.patch('/items/:itemId', async (req, res) => {
  const parsed = updateChecklistItemSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const existing = await prisma.checklistItem.findUnique({
    where: { id: req.params['itemId'] },
    include: { checklist: true },
  })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Item not found' })
    return
  }

  const item = await prisma.checklistItem.update({
    where: { id: req.params['itemId'] },
    data: parsed.data,
  })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.checklist.babyId}`).emit('checklist:updated', {
    type: existing.checklist.type,
    babyId: existing.checklist.babyId,
  })

  res.json({ data: item, error: null })
})

// DELETE /api/checklist/items/:itemId
checklistRouter.delete('/items/:itemId', async (req, res) => {
  const existing = await prisma.checklistItem.findUnique({
    where: { id: req.params['itemId'] },
    include: { checklist: true },
  })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Item not found' })
    return
  }

  await prisma.checklistItem.delete({ where: { id: req.params['itemId'] } })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.checklist.babyId}`).emit('checklist:updated', {
    type: existing.checklist.type,
    babyId: existing.checklist.babyId,
  })

  res.json({ data: { success: true }, error: null })
})
