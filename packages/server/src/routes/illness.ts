import { Router } from 'express'
import type { Server } from 'socket.io'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import {
  createEpisodeSchema,
  addSymptomSchema,
  logTemperatureSchema,
  updateEpisodeTimesSchema,
} from '@tracker/shared'

const toTitleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

export const illnessRouter = Router()
illnessRouter.use(authMiddleware)

// GET /api/illness?babyId=&active=true
illnessRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const activeOnly = req.query['active'] === 'true'

  if (activeOnly) {
    const episode = await prisma.sicknessEpisode.findFirst({
      where: { babyId, endedAt: null },
      include: {
        symptoms: { orderBy: { createdAt: 'asc' } },
        temperatureLogs: { orderBy: { recordedAt: 'asc' } },
      },
      orderBy: { startedAt: 'desc' },
    })
    res.json({ data: episode, error: null })
    return
  }

  const episodes = await prisma.sicknessEpisode.findMany({
    where: { babyId },
    include: {
      symptoms: { orderBy: { createdAt: 'asc' } },
      temperatureLogs: { orderBy: { recordedAt: 'asc' } },
    },
    orderBy: { startedAt: 'desc' },
  })
  res.json({ data: episodes, error: null })
})

// GET /api/illness/:id
illnessRouter.get('/:id', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({
    where: { id: req.params['id'] },
    include: {
      symptoms: { orderBy: { createdAt: 'asc' } },
      temperatureLogs: { orderBy: { recordedAt: 'asc' } },
      feedingLogs: { orderBy: { startedAt: 'asc' } },
      sleepLogs: { orderBy: { startedAt: 'asc' } },
      diaperLogs: { orderBy: { occurredAt: 'asc' } },
      medicationLogs: { orderBy: { givenAt: 'asc' } },
      moodLogs: { orderBy: { occurredAt: 'asc' } },
    },
  })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }
  res.json({ data: episode, error: null })
})

// POST /api/illness — open new episode
illnessRouter.post('/', async (req, res) => {
  const parsed = createEpisodeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { babyId, startedAt, symptoms, notes } = parsed.data

  const existing = await prisma.sicknessEpisode.findFirst({
    where: { babyId, endedAt: null },
  })
  if (existing) {
    res.status(409).json({ data: null, error: 'An episode is already active for this baby' })
    return
  }

  const episode = await prisma.sicknessEpisode.create({
    data: {
      babyId,
      startedById: req.user!.userId,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      notes,
      symptoms: symptoms.length > 0 ? {
        create: symptoms.map((label) => ({ label: toTitleCase(label) })),
      } : undefined,
    },
    include: {
      symptoms: { orderBy: { createdAt: 'asc' } },
      temperatureLogs: { orderBy: { recordedAt: 'asc' } },
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${babyId}`).emit('illness:started', { babyId, episodeId: episode.id })

  res.status(201).json({ data: episode, error: null })
})

// PATCH /api/illness/:id/end — mark as better
illnessRouter.patch('/:id/end', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }

  const updated = await prisma.sicknessEpisode.update({
    where: { id: episode.id },
    data: { endedAt: new Date() },
    include: {
      symptoms: { orderBy: { createdAt: 'asc' } },
      temperatureLogs: { orderBy: { recordedAt: 'asc' } },
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${episode.babyId}`).emit('illness:ended', { babyId: episode.babyId, episodeId: episode.id })

  res.json({ data: updated, error: null })
})

// PATCH /api/illness/:id/reopen — reopen a resolved episode
illnessRouter.patch('/:id/reopen', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }

  const existing = await prisma.sicknessEpisode.findFirst({
    where: { babyId: episode.babyId, endedAt: null, NOT: { id: episode.id } },
  })
  if (existing) {
    res.status(409).json({ data: null, error: 'Another episode is already active' })
    return
  }

  const updated = await prisma.sicknessEpisode.update({
    where: { id: episode.id },
    data: { endedAt: null },
    include: { symptoms: true, temperatureLogs: true },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${episode.babyId}`).emit('illness:started', { babyId: episode.babyId, episodeId: episode.id })

  res.json({ data: updated, error: null })
})

// PATCH /api/illness/:id — update episode times / notes
illnessRouter.patch('/:id', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }

  const parsed = updateEpisodeTimesSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: 'Invalid request body' }); return }

  const { startedAt, endedAt, notes } = parsed.data

  if (startedAt && endedAt && new Date(startedAt) >= new Date(endedAt)) {
    res.status(400).json({ data: null, error: 'Start time must be before end time' })
    return
  }

  const updated = await prisma.sicknessEpisode.update({
    where: { id: episode.id },
    data: {
      ...(startedAt !== undefined && { startedAt: new Date(startedAt) }),
      ...(endedAt !== undefined && { endedAt: new Date(endedAt) }),
      ...(notes !== undefined && { notes }),
    },
    include: { symptoms: true, temperatureLogs: true },
  })

  res.json({ data: updated, error: null })
})

// POST /api/illness/:id/symptoms
illnessRouter.post('/:id/symptoms', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }

  const parsed = addSymptomSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid' }); return }

  const symptom = await prisma.sicknessSymptom.create({
    data: { episodeId: episode.id, label: toTitleCase(parsed.data.label) },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${episode.babyId}`).emit('illness:symptom:added', { babyId: episode.babyId, episodeId: episode.id })

  res.status(201).json({ data: symptom, error: null })
})

// DELETE /api/illness/:id/symptoms/:symptomId
illnessRouter.delete('/:id/symptoms/:symptomId', async (req, res) => {
  const symptom = await prisma.sicknessSymptom.findUnique({ where: { id: req.params['symptomId'] } })
  if (!symptom || symptom.episodeId !== req.params['id']) {
    res.status(404).json({ data: null, error: 'Symptom not found' })
    return
  }

  await prisma.sicknessSymptom.delete({ where: { id: symptom.id } })

  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (episode) {
    const io = req.app.get('io') as Server
    io.to(`family:${episode.babyId}`).emit('illness:symptom:added', { babyId: episode.babyId, episodeId: episode.id })
  }

  res.json({ data: { id: symptom.id }, error: null })
})

const nlpTemperatureSchema = z.object({
  babyId: z.string().min(1),
  tempF: z.number().min(90, 'Min 90°F').max(115, 'Max 115°F').optional(),
  tempC: z.number().min(32, 'Min 32°C').max(46, 'Max 46°C').optional(),
  method: z.enum(['FOREHEAD', 'EAR', 'RECTAL', 'AXILLARY', 'ORAL']).default('FOREHEAD'),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(200).optional(),
}).refine((d) => d.tempF !== undefined || d.tempC !== undefined, {
  message: 'Temperature value is required',
})

// POST /api/illness/temperature — NLP quick-log; links to active episode if one exists
illnessRouter.post('/temperature', async (req, res) => {
  const parsed = nlpTemperatureSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid' })
    return
  }

  const { babyId, tempF, tempC, method, recordedAt, notes } = parsed.data
  const storedTempF = tempF ?? (tempC! * 9) / 5 + 32

  const activeEpisode = await prisma.sicknessEpisode.findFirst({
    where: { babyId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  })

  const log = await prisma.temperatureLog.create({
    data: {
      babyId,
      episodeId: activeEpisode?.id ?? null,
      loggedById: req.user!.userId,
      tempF: storedTempF,
      method,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      notes,
    },
  })

  const io = req.app.get('io') as Server
  if (activeEpisode) {
    io.to(`family:${babyId}`).emit('illness:temp:logged', { babyId, episodeId: activeEpisode.id })
  }

  res.status(201).json({ data: log, error: null })
})

// POST /api/illness/:id/temperature
illnessRouter.post('/:id/temperature', async (req, res) => {
  const episode = await prisma.sicknessEpisode.findUnique({ where: { id: req.params['id'] } })
  if (!episode) { res.status(404).json({ data: null, error: 'Episode not found' }); return }

  const parsed = logTemperatureSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]?.message ?? 'Invalid' })
    return
  }

  const { tempF, tempC, method, recordedAt, notes } = parsed.data
  const storedTempF = tempF ?? (tempC! * 9) / 5 + 32

  const log = await prisma.temperatureLog.create({
    data: {
      babyId: episode.babyId,
      episodeId: episode.id,
      loggedById: req.user!.userId,
      tempF: storedTempF,
      method,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      notes,
    },
  })

  const io = req.app.get('io') as Server
  io.to(`family:${episode.babyId}`).emit('illness:temp:logged', { babyId: episode.babyId, episodeId: episode.id })

  res.status(201).json({ data: log, error: null })
})

// DELETE /api/illness/:id/temperature/:tempId
illnessRouter.delete('/:id/temperature/:tempId', async (req, res) => {
  const log = await prisma.temperatureLog.findUnique({ where: { id: req.params['tempId'] } })
  if (!log || log.episodeId !== req.params['id']) {
    res.status(404).json({ data: null, error: 'Temperature log not found' })
    return
  }

  await prisma.temperatureLog.delete({ where: { id: log.id } })

  res.json({ data: { id: log.id }, error: null })
})

// Helper exported for use in other routes — checks for active episode and returns its id
export async function getActiveEpisodeId(babyId: string): Promise<string | null> {
  const episode = await prisma.sicknessEpisode.findFirst({
    where: { babyId, endedAt: null },
    select: { id: true },
  })
  return episode?.id ?? null
}
