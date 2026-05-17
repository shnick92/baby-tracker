import type { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const babyId = socket.handshake.auth['babyId'] as string | undefined
    if (babyId) {
      socket.join(`family:${babyId}`)
    }

    socket.on('disconnect', () => {})
  })
}
