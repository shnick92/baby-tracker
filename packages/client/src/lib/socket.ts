import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
      autoConnect: false,
      withCredentials: true,
    })
  }
  return socket
}

export function connectSocket(token: string, babyId: string | null) {
  const s = getSocket()
  s.auth = { token, babyId }
  s.connect()
}

export function disconnectSocket() {
  socket?.disconnect()
}
