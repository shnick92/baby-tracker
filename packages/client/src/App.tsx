import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { api } from './lib/axios'
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './features/dashboard/Dashboard'
import { useAuthStore, type AuthUser } from './stores/authStore'

type RefreshData = { accessToken: string; user: AuthUser; babyId: string | null }

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setAuth, setBootstrapped, isBootstrapping } = useAuthStore()

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

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
