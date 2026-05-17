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
import { errorHandler } from './middleware/errorHandler'
import { setupSocket } from './socket/index'

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

app.use('/api/auth', authRouter)
app.use('/api/auth/passkey', passkeyRouter)
app.use('/api/checklist', checklistRouter)
app.use('/api/purchases', purchaseRouter)
app.use('/api/visitors', visitorRouter)

app.use(errorHandler)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const shutdown = () => {
  server.closeAllConnections()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
