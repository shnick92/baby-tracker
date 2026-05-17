import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { loginSchema, type LoginInput } from '@tracker/shared'
import { api } from '@lib/axios'
import { useAuthStore, type AuthUser } from '@stores/authStore'
import { PasskeyLoginButton } from './PasskeyLoginButton'

type LoginData = { accessToken: string; user: AuthUser; babyId: string | null }
type LoginError = AxiosError<{ error: string | null }>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const { mutate, isPending, error } = useMutation<LoginData, LoginError, LoginInput>({
    mutationFn: (data) =>
      api.post<{ data: LoginData; error: null }>('/api/auth/login', data).then((r) => r.data.data),
    onSuccess: ({ accessToken, user, babyId }) => {
      setAuth(accessToken, user, babyId)
      navigate('/', { replace: true })
    },
  })

  const serverError = error?.response?.data?.error ?? (error ? 'Login failed. Please try again.' : null)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Baby Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutate(data))}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white px-2">or</span>
            </div>
          </div>

          <PasskeyLoginButton />
        </form>
      </div>
    </div>
  )
}
