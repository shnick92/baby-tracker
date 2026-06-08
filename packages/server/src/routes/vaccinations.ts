import { Router } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logVaccinationSchema, updateVaccinationSchema, getVaccineByKey } from '@tracker/shared'

export const vaccinationsRouter = Router()
vaccinationsRouter.use(authMiddleware)

// GET /api/vaccinations?babyId=
vaccinationsRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const records = await prisma.vaccinationRecord.findMany({
    where: { babyId },
    orderBy: { administeredAt: 'asc' },
  })

  res.json({ data: records, error: null })
})

// POST /api/vaccinations
vaccinationsRouter.post('/', async (req, res) => {
  const parsed = logVaccinationSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  if (!getVaccineByKey(parsed.data.vaccineKey)) {
    res.status(400).json({ data: null, error: 'Unknown vaccine key' })
    return
  }

  const record = await prisma.vaccinationRecord.create({
    data: {
      babyId: parsed.data.babyId,
      vaccineKey: parsed.data.vaccineKey,
      administeredAt: new Date(parsed.data.administeredAt),
      lotNumber: parsed.data.lotNumber,
      provider: parsed.data.provider,
      notes: parsed.data.notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${record.babyId}`).emit('vaccination:created', { babyId: record.babyId })

  res.status(201).json({ data: record, error: null })
})

// PATCH /api/vaccinations/:id
vaccinationsRouter.patch('/:id', async (req, res) => {
  const existing = await prisma.vaccinationRecord.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Vaccination record not found' }); return }

  const parsed = updateVaccinationSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { administeredAt, lotNumber, provider, notes } = parsed.data

  const record = await prisma.vaccinationRecord.update({
    where: { id: existing.id },
    data: {
      ...(administeredAt !== undefined && { administeredAt: new Date(administeredAt) }),
      ...(lotNumber !== undefined && { lotNumber }),
      ...(provider !== undefined && { provider }),
      ...(notes !== undefined && { notes }),
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${record.babyId}`).emit('vaccination:updated', { babyId: record.babyId })

  res.json({ data: record, error: null })
})

// DELETE /api/vaccinations/:id
vaccinationsRouter.delete('/:id', async (req, res) => {
  const record = await prisma.vaccinationRecord.findUnique({ where: { id: req.params['id'] } })
  if (!record) { res.status(404).json({ data: null, error: 'Vaccination record not found' }); return }

  await prisma.vaccinationRecord.delete({ where: { id: record.id } })

  const io = req.app.get('io') as Server
  io.to(`family:${record.babyId}`).emit('vaccination:deleted', { babyId: record.babyId })

  res.json({ data: { id: record.id }, error: null })
})
