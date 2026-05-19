import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { createPurchaseSchema, updatePurchaseSchema } from '@tracker/shared'
import { createShortLink } from '../services/shortLink'

export const purchaseRouter = Router()
purchaseRouter.use(authMiddleware)

// GET /api/purchases?babyId=
purchaseRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const purchases = await prisma.purchase.findMany({
    where: { babyId },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })

  const total = purchases.length
  const bought = purchases.filter((p) => p.status === 'BOUGHT' || p.status === 'GIFTED').length

  res.json({ data: purchases, error: null, meta: { total, bought } })
})

// POST /api/purchases?babyId=
purchaseRouter.post('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const parsed = createPurchaseSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  let shortCode: string | undefined
  if (parsed.data.url) {
    shortCode = await createShortLink({ originalUrl: parsed.data.url, babyId, createdById: req.user!.userId })
  }

  const purchase = await prisma.purchase.create({
    data: { babyId, ...parsed.data, ...(shortCode ? { shortCode } : {}) },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('purchase:updated', { babyId })

  res.status(201).json({ data: purchase, error: null })
})

// PATCH /api/purchases/:id
purchaseRouter.patch('/:id', async (req, res) => {
  const parsed = updatePurchaseSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const existing = await prisma.purchase.findUnique({ where: { id: req.params['id'] } })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Purchase not found' })
    return
  }

  let shortCodeUpdate: { shortCode: string } | undefined
  if (parsed.data.url && parsed.data.url !== existing.url) {
    const code = await createShortLink({
      originalUrl: parsed.data.url,
      babyId: existing.babyId,
      createdById: req.user!.userId,
    })
    shortCodeUpdate = { shortCode: code }
  }

  const purchase = await prisma.purchase.update({
    where: { id: req.params['id'] },
    data: { ...parsed.data, ...shortCodeUpdate },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('purchase:updated', { babyId: existing.babyId })

  res.json({ data: purchase, error: null })
})

// DELETE /api/purchases/:id
purchaseRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.purchase.findUnique({ where: { id: req.params['id'] } })
  if (!existing) {
    res.status(404).json({ data: null, error: 'Purchase not found' })
    return
  }

  await prisma.purchase.delete({ where: { id: req.params['id'] } })

  const io = req.app.get('io') as Server
  io.to(`family:${existing.babyId}`).emit('purchase:updated', { babyId: existing.babyId })

  res.json({ data: { success: true }, error: null })
})
