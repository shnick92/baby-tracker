import { Router } from 'express'
import { exportQuerySchema, healthSummaryQuerySchema } from '@tracker/shared'
import { authMiddleware } from '../middleware/auth'
import { createZip } from '../lib/zip'
import {
  fetchRawExportData,
  buildCsvFiles,
  buildRawDataPdf,
  buildHealthSummaryPdf,
  countExportRecords,
} from '../services/export'

export const exportRouter = Router()
exportRouter.use(authMiddleware)

// GET /api/export/preview?babyId=&types=&from=&to=&format=
// Returns record counts so the client can show "7-day PDF — 142 records".
exportRouter.get('/preview', async (req, res) => {
  const parsed = exportQuerySchema.safeParse({ ...req.query, format: req.query['format'] ?? 'pdf' })
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]!.message })
    return
  }
  const { babyId, types, from, to } = parsed.data
  const counts = await countExportRecords(babyId, types, from, to)
  res.json({ data: counts, error: null })
})

// GET /api/export?babyId=&types=feeding,sleep&from=YYYY-MM-DD&to=YYYY-MM-DD&format=pdf|csv
// PDF → single formatted report; CSV → one .csv (single type) or .zip of CSVs.
exportRouter.get('/', async (req, res) => {
  const parsed = exportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]!.message })
    return
  }
  const { babyId, types, from, to, format } = parsed.data

  const data = await fetchRawExportData(babyId, types, from, to)
  const stem = `tracker-export-${from}-to-${to}`

  if (format === 'pdf') {
    const pdf = await buildRawDataPdf(data, types, from, to)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${stem}.pdf"`)
    res.send(pdf)
    return
  }

  const files = buildCsvFiles(data, types)
  if (files.length === 1) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${stem}-${files[0]!.name}"`)
    res.send(files[0]!.content)
    return
  }

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${stem}.zip"`)
  res.send(createZip(files))
})

// GET /api/export/health-summary?babyId=&sections=vaccinations,medications
exportRouter.get('/health-summary', async (req, res) => {
  const parsed = healthSummaryQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.issues[0]!.message })
    return
  }
  const { babyId, sections } = parsed.data

  const pdf = await buildHealthSummaryPdf(babyId, sections)
  if (!pdf) {
    res.status(404).json({ data: null, error: 'Baby not found' })
    return
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="health-summary-${new Date().toISOString().slice(0, 10)}.pdf"`)
  res.send(pdf)
})
