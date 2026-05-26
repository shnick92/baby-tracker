import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@lib/queryClient'
import { api } from '@lib/axios'
import { connectSocket, disconnectSocket, getSocket } from '@lib/socket'
import { useAuthStore, type AuthUser } from '@stores/authStore'
import { useSocketStore } from '@stores/socketStore'
import { useSosStore } from '@stores/sosStore'
import { usePushSubscription } from '@hooks/usePushSubscription'
import { ProtectedRoute, AppLayout, Toast } from '@components'
import { LoginPage } from '@features/auth'
import { Dashboard } from '@features/dashboard'
import { ChecklistPage } from '@features/checklist'
import { PurchasesPage } from '@features/purchases'
import { VisitorsPage } from '@features/visitors'
import { FeedingPage } from '@features/feeding'
import { SleepPage } from '@features/sleep'
import { DiaperPage } from '@features/diaper'
import { AlertsPage, SOSAlert } from '@features/alerts'
import { MorePage } from '@features/more'
import { MedicationPage } from '@features/medication'
import { WeightPage } from '@features/weight'
import { TummyTimePage } from '@features/tummyTime'
import { MoodPage } from '@features/mood'
import { HistoryPage } from '@features/history'
import { CalendarPage } from '@features/calendar'
import { ChatPage } from '@features/ai'

type RefreshData = { accessToken: string; user: AuthUser; babyId: string | null; birthDate: string | null }

type SosSocketPayload = {
  alertId: string
  senderId: string
  senderName: string
  message: string | null
  sentAt: string
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setAuth, setBootstrapped, isBootstrapping, accessToken, babyId, user } = useAuthStore()
  const setSocketStatus = useSocketStore((s) => s.setStatus)
  const showAlert = useSosStore((s) => s.showAlert)

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
    if (data) setAuth(data.accessToken, data.user, data.babyId, data.birthDate)
  }, [data, setAuth])

  useEffect(() => {
    if (isError) setBootstrapped()
  }, [isError, setBootstrapped])

  usePushSubscription(!!accessToken)

  // Connect socket when authenticated, disconnect on logout
  useEffect(() => {
    if (!accessToken) {
      disconnectSocket()
      return
    }
    const socket = getSocket()
    setSocketStatus('connecting')
    connectSocket(accessToken, babyId)

    socket.on('connect', () => {
      setSocketStatus('synced')
      queryClient.invalidateQueries()
    })
    socket.on('disconnect', () => setSocketStatus('unsynced'))

    // Show in-app SOS takeover alert for the recipient
    socket.on('alert:sos', (payload: SosSocketPayload) => {
      if (payload.senderId === user?.id) return
      showAlert({
        alertId: payload.alertId,
        senderName: payload.senderName,
        message: payload.message,
        sentAt: payload.sentAt,
      })
      queryClient.invalidateQueries({ queryKey: ['alerts', babyId] })
    })

    socket.on('alert:acknowledged', () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', babyId] })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('alert:sos')
      socket.off('alert:acknowledged')
    }
  }, [accessToken, babyId, setSocketStatus, showAlert, user?.id])

  // Listen for SW postMessage when SOS push arrives while app is open
  useEffect(() => {
    if (!accessToken) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'sos' && event.data?.alertId) {
        queryClient.invalidateQueries({ queryKey: ['alerts', babyId] })
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [accessToken, babyId])

  // Deep-link handler: notification tap opens /?sos=<alertId> when app is closed.
  // Once auth resolves, fetch the alert and show the overlay so the user can acknowledge.
  useEffect(() => {
    if (!accessToken || !user) return
    const params = new URLSearchParams(window.location.search)
    const sosAlertId = params.get('sos')
    if (!sosAlertId) return

    window.history.replaceState({}, '', window.location.pathname)

    api
      .get<{ data: { alert: { id: string; sentById: string; sentToId: string; sentBy: { name: string }; message: string | null; sentAt: string; status: string } }; error: null }>(
        `/api/alerts/${sosAlertId}`,
      )
      .then((r) => {
        const alert = r.data.data?.alert
        if (!alert) return
        if (alert.sentToId !== user.id) return
        if (alert.status === 'ACKNOWLEDGED') return
        showAlert({ alertId: alert.id, senderName: alert.sentBy.name, message: alert.message, sentAt: alert.sentAt })
      })
      .catch(() => {})
  }, [accessToken, user, showAlert])

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
        <ScrollToTop />
        <AuthBootstrap>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/feeding" element={<FeedingPage />} />
              <Route path="/sleep" element={<SleepPage />} />
              <Route path="/diaper" element={<DiaperPage />} />
              <Route path="/checklist/:type" element={<ChecklistPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/visitors" element={<VisitorsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/medication" element={<MedicationPage />} />
              <Route path="/weight" element={<WeightPage />} />
              <Route path="/tummy-time" element={<TummyTimePage />} />
              <Route path="/mood" element={<MoodPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ai/chat" element={<ChatPage />} />
            </Route>
          </Routes>
          <SOSAlert />
        </AuthBootstrap>
      </BrowserRouter>
      <Toast />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
