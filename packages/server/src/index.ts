import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'
import { authRouter } from './routes/auth'
import { passkeyRouter } from './routes/passkey'
import { checklistRouter } from './routes/checklist'
import { purchaseRouter } from './routes/purchase'
import { visitorRouter } from './routes/visitor'
import { shortLinkRouter } from './routes/shortLink'
import { pregnancyRouter } from './routes/pregnancy'
import { feedingRouter } from './routes/feeding'
import { sleepRouter } from './routes/sleep'
import { diaperRouter } from './routes/diaper'
import { medicationRouter } from './routes/medication'
import { weightRouter } from './routes/weight'
import { tummyTimeRouter } from './routes/tummyTime'
import { moodRouter } from './routes/mood'
import { historyRouter } from './routes/history'
import { calendarRouter } from './routes/calendar'
import { errorHandler } from './middleware/errorHandler'
import { setupSocket } from './socket/index'
import pushRouter from './routes/push'
import settingsRouter from './routes/settings'
import alertsRouter from './routes/alerts'
import { aiRouter } from './routes/ai'
import { startCronJobs, runWakeWindowCheck } from './lib/cron'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT ?? 3001

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})

setupSocket(io)

// Attach io to app so routes can emit events
app.set('io', io)

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' }, error: null })
})

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/wake-check', async (_req, res) => {
    console.log('[debug] manual wake-window check triggered')
    await runWakeWindowCheck()
    res.json({ data: { ok: true }, error: null })
  })
}

app.use('/api/auth', authRouter)
app.use('/api/auth/passkey', passkeyRouter)
app.use('/api/checklist', checklistRouter)
app.use('/api/purchases', purchaseRouter)
app.use('/api/visitors', visitorRouter)
app.use('/api/pregnancy', pregnancyRouter)
app.use('/api/feeding', feedingRouter)
app.use('/api/sleep', sleepRouter)
app.use('/api/diaper', diaperRouter)
app.use('/api/medication', medicationRouter)
app.use('/api/weight', weightRouter)
app.use('/api/tummy-time', tummyTimeRouter)
app.use('/api/mood', moodRouter)
app.use('/api/history', historyRouter)
app.use('/api/calendar', calendarRouter)
app.use('/s', shortLinkRouter)
app.use('/api/push', pushRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/ai', aiRouter)

app.use(errorHandler)

startCronJobs(io)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
