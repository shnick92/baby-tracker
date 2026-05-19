import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@lib/queryClient'
import { api } from '@lib/axios'
import { connectSocket, disconnectSocket, getSocket } from '@lib/socket'
import { useAuthStore, type AuthUser } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { ProtectedRoute } from '@components'
import { LoginPage } from '@features/auth'
import { Dashboard } from '@features/dashboard'
import { ChecklistPage } from '@features/checklist'
import { PurchasesPage } from '@features/purchases'
import { VisitorsPage } from '@features/visitors'

type RefreshData = { accessToken: string; user: AuthUser; babyId: string | null }

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setAuth, setBootstrapped, isBootstrapping, accessToken, babyId } = useAuthStore()
  const setSocketStatus = useSocketStore((s) => s.setStatus)

  const { data, isError } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: () =>
      api
        .post<{ data: RefreshData; error: null }>('/api/auth/refresh')
        .then((r) => r.data.data),
    retry: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (data) setAuth(data.accessToken, data.user, data.babyId)
  }, [data, setAuth])

  useEffect(() => {
    if (isError) setBootstrapped()
  }, [isError, setBootstrapped])

  // Connect socket when authenticated, disconnect on logout
  useEffect(() => {
    if (!accessToken) {
      disconnectSocket()
      return
    }
    const socket = getSocket()
    setSocketStatus('connecting')
    connectSocket(accessToken, babyId)

    socket.on('connect', () => setSocketStatus('synced'))
    socket.on('disconnect', () => setSocketStatus('unsynced'))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [accessToken, babyId, setSocketStatus])

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

function guard(path: string, element: React.ReactElement) {
  return <Route path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {guard('/', <Dashboard />)}
            {guard('/checklist/:type', <ChecklistPage />)}
            {guard('/purchases', <PurchasesPage />)}
            {guard('/visitors', <VisitorsPage />)}
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
