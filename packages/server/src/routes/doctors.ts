import { Router } from 'express'
import type { Request } from 'express'
import type { Server } from 'socket.io'
import {
  createDoctorSchema,
  updateDoctorSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from '@tracker/shared'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { chooseDoctor, unchooseDoctor, toAppointmentWriteData } from '../services/doctors'

export const doctorsRouter = Router()
doctorsRouter.use(authMiddleware)

const APPOINTMENT_INCLUDE = { doctor: { select: { id: true, name: true, practiceName: true, address: true } } } as const

function emitUpdated(req: Request, babyId: string) {
  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('doctors:updated', { babyId })
}

// ── Appointments (declared before /:id so "appointments" is never read as a doctor id) ──

// GET /api/doctors/appointments?babyId=&from=&to=
doctorsRouter.get('/appointments', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const from = req.query['from'] ? (req.query['from'] as string).slice(0, 10) : undefined
  const to = req.query['to'] ? (req.query['to'] as string).slice(0, 10) : undefined

  const appointments = await prisma.doctorAppointment.findMany({
    where: {
      babyId,
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: [{ date: 'asc' }, { startTime: { sort: 'asc', nulls: 'last' } }],
  })

  res.json({ data: appointments, error: null })
})

// PATCH /api/doctors/appointments/:id
doctorsRouter.patch('/appointments/:id', async (req, res) => {
  const parsed = updateAppointmentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid request body' })
    return
  }

  const existing = await prisma.doctorAppointment.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Appointment not found' }); return }

  if (parsed.data.doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } })
    if (!doctor || doctor.babyId !== existing.babyId) {
      res.status(400).json({ data: null, error: 'Doctor not found' })
      return
    }
  }

  const appointment = await prisma.doctorAppointment.update({
    where: { id: existing.id },
    data: toAppointmentWriteData(parsed.data),
    include: APPOINTMENT_INCLUDE,
  })

  emitUpdated(req, existing.babyId)
  res.json({ data: appointment, error: null })
})

// DELETE /api/doctors/appointments/:id
doctorsRouter.delete('/appointments/:id', async (req, res) => {
  const existing = await prisma.doctorAppointment.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Appointment not found' }); return }

  await prisma.doctorAppointment.delete({ where: { id: existing.id } })

  emitUpdated(req, existing.babyId)
  res.json({ data: { success: true }, error: null })
})

// ── Doctors ──────────────────────────────────────────────────────────────────

// GET /api/doctors?babyId=
doctorsRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const doctors = await prisma.doctor.findMany({
    where: { babyId },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ isChosen: 'desc' }, { createdAt: 'asc' }],
  })

  res.json({ data: doctors, error: null })
})

// POST /api/doctors?babyId=
doctorsRouter.post('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const parsed = createDoctorSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid request body' })
    return
  }

  const d = parsed.data
  const doctor = await prisma.doctor.create({
    data: {
      babyId,
      addedById: req.user!.userId,
      name: d.name.trim(),
      specialty: d.specialty?.trim() || null,
      practiceName: d.practiceName?.trim() || null,
      address: d.address?.trim() || null,
      phone: d.phone?.trim() || null,
      notes: d.notes?.trim() || null,
    },
    include: { _count: { select: { appointments: true } } },
  })

  emitUpdated(req, babyId)
  res.status(201).json({ data: doctor, error: null })
})

// PATCH /api/doctors/:id
doctorsRouter.patch('/:id', async (req, res) => {
  const parsed = updateDoctorSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid request body' })
    return
  }

  const existing = await prisma.doctor.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Doctor not found' }); return }

  const d = parsed.data
  const text = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null)

  const doctor = await prisma.doctor.update({
    where: { id: existing.id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      specialty: text(d.specialty),
      practiceName: text(d.practiceName),
      address: text(d.address),
      phone: text(d.phone),
      notes: text(d.notes),
    },
    include: { _count: { select: { appointments: true } } },
  })

  emitUpdated(req, existing.babyId)
  res.json({ data: doctor, error: null })
})

// POST /api/doctors/:id/choose  — mark as the family's doctor (clears any other)
// DELETE /api/doctors/:id/choose — clear the chosen flag
doctorsRouter.post('/:id/choose', async (req, res) => {
  const existing = await prisma.doctor.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Doctor not found' }); return }

  const doctor = await chooseDoctor(existing.babyId, existing.id)

  emitUpdated(req, existing.babyId)
  res.json({ data: doctor, error: null })
})

doctorsRouter.delete('/:id/choose', async (req, res) => {
  const existing = await prisma.doctor.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Doctor not found' }); return }

  const doctor = await unchooseDoctor(existing.id)

  emitUpdated(req, existing.babyId)
  res.json({ data: doctor, error: null })
})

// POST /api/doctors/:id/appointments
doctorsRouter.post('/:id/appointments', async (req, res) => {
  const parsed = createAppointmentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid request body' })
    return
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: req.params['id'] } })
  if (!doctor) { res.status(404).json({ data: null, error: 'Doctor not found' }); return }

  const data = toAppointmentWriteData(parsed.data)
  const appointment = await prisma.doctorAppointment.create({
    data: {
      babyId: doctor.babyId,
      doctorId: doctor.id,
      date: parsed.data.date,
      title: (data.title as string | null | undefined) ?? null,
      notes: (data.notes as string | null | undefined) ?? null,
      startTime: (data.startTime as Date | null | undefined) ?? null,
      endTime: (data.endTime as Date | null | undefined) ?? null,
    },
    include: APPOINTMENT_INCLUDE,
  })

  emitUpdated(req, doctor.babyId)
  res.status(201).json({ data: appointment, error: null })
})

// DELETE /api/doctors/:id — cascades to that doctor's appointments
doctorsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.doctor.findUnique({ where: { id: req.params['id'] } })
  if (!existing) { res.status(404).json({ data: null, error: 'Doctor not found' }); return }

  await prisma.doctor.delete({ where: { id: existing.id } })

  emitUpdated(req, existing.babyId)
  res.json({ data: { success: true }, error: null })
})
