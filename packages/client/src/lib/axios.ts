import axios from 'axios'
import { useAuthStore } from '@stores/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number }
      config?: { _retry?: boolean; headers: Record<string, string> } & Record<string, unknown>
    }

    if (axiosError.response?.status !== 401 || axiosError.config?._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          if (axiosError.config) {
            axiosError.config.headers['Authorization'] = `Bearer ${token}`
            resolve(api(axiosError.config))
          }
        })
      })
    }

    if (!axiosError.config) return Promise.reject(error)

    axiosError.config._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? ''}/api/auth/refresh`,
        null,
        { withCredentials: true },
      )
      const newToken = data.data.accessToken as string
      useAuthStore.getState().setAccessToken(newToken)
      refreshQueue.forEach((cb) => cb(newToken))
      refreshQueue = []
      axiosError.config.headers['Authorization'] = `Bearer ${newToken}`
      return api(axiosError.config)
    } catch {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
