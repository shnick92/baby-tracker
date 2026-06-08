import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { addBabyNameSchema, updateBabyNameSchema, reactToBabyNameSchema } from '@tracker/shared'

export const babyNamesRouter = Router()
babyNamesRouter.use(authMiddleware)

// GET /api/baby-names?babyId= — list all names with reactions
babyNamesRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const names = await prisma.babyName.findMany({
    where: { babyId },
    include: { reactions: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ data: names, error: null })
})

// POST /api/baby-names — add a new name candidate
babyNamesRouter.post('/', async (req, res) => {
  const parsed = addBabyNameSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const name = await prisma.babyName.create({
    data: {
      babyId: parsed.data.babyId,
      firstName: parsed.data.firstName,
      middleName: parsed.data.middleName,
      addedById: req.user!.userId,
    },
    include: { reactions: true },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${name.babyId}`).emit('babyName:created', { babyId: name.babyId })

  res.status(201).json({ data: name, error: null })
})

// PATCH /api/baby-names/:id
babyNamesRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.babyName.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Name not found' }); return }
  if (existing.addedById !== req.user!.userId) {
    res.status(403).json({ data: null, error: 'Can only edit your own names' })
    return
  }

  const parsed = updateBabyNameSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const name = await prisma.babyName.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.firstName !== undefined && { firstName: parsed.data.firstName }),
      ...(parsed.data.middleName !== undefined && { middleName: parsed.data.middleName }),
    },
    include: { reactions: true },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${name.babyId}`).emit('babyName:updated', { babyId: name.babyId })

  res.json({ data: name, error: null })
})

// DELETE /api/baby-names/:id
babyNamesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.babyName.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Name not found' }); return }
  if (existing.addedById !== req.user!.userId) {
    res.status(403).json({ data: null, error: 'Can only delete your own names' })
    return
  }

  await prisma.babyName.delete({ where: { id: existing.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('babyName:deleted', { babyId: existing.babyId })

  res.json({ data: { id: existing.id }, error: null })
})

// PUT /api/baby-names/:id/reaction — upsert a reaction (one emoji per user per name)
babyNamesRouter.put('/:id/reaction', async (req, res) => {
  const name = await prisma.babyName.findUnique({ where: { id: req.params['id'] } })
  if (!name) { res.status(404).json({ data: null, error: 'Name not found' }); return }

  const parsed = reactToBabyNameSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid emoji' }); return }

  const reaction = await prisma.babyNameReaction.upsert({
    where: { nameId_userId: { nameId: name.id, userId: req.user!.userId } },
    create: { nameId: name.id, userId: req.user!.userId, emoji: parsed.data.emoji },
    update: { emoji: parsed.data.emoji },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${name.babyId}`).emit('babyName:reacted', { babyId: name.babyId })

  res.json({ data: reaction, error: null })
})

// DELETE /api/baby-names/:id/reaction — remove your reaction
babyNamesRouter.delete('/:id/reaction', async (req, res) => {
  const name = await prisma.babyName.findUnique({ where: { id: req.params['id'] } })
  if (!name) { res.status(404).json({ data: null, error: 'Name not found' }); return }

  await prisma.babyNameReaction.deleteMany({
    where: { nameId: name.id, userId: req.user!.userId },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${name.babyId}`).emit('babyName:reacted', { babyId: name.babyId })

  res.json({ data: { removed: true }, error: null })
})
