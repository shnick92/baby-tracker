import { useMutation } from '@tanstack/react-query'
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { useAuthStore, type AuthUser } from '../../stores/authStore'

type LoginData = { accessToken: string; user: AuthUser; babyId: string | null }

export function PasskeyLoginButton() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const { data: optRes } = await api.post<{
        data: PublicKeyCredentialRequestOptionsJSON
        error: null
      }>('/api/auth/passkey/auth/options')

      const authResponse = await startAuthentication({ optionsJSON: optRes.data })

      const { data: verifyRes } = await api.post<{ data: LoginData; error: null }>(
        '/api/auth/passkey/auth/verify',
        { response: authResponse },
      )
      return verifyRes.data
    },
    onSuccess: ({ accessToken, user, babyId }) => {
      setAuth(accessToken, user, babyId)
      navigate('/', { replace: true })
    },
  })

  const errorMessage = (() => {
    if (!error) return null
    // User cancelled the native prompt — don't show an error
    if (error instanceof Error && error.name === 'NotAllowedError') return null
    return 'Passkey sign-in failed. Try your password instead.'
  })()

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => mutate()}
        disabled={isPending}
        className="w-full py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
        {isPending ? 'Waiting for biometric…' : 'Sign in with passkey'}
      </button>
      {errorMessage && <p className="text-xs text-center text-red-600">{errorMessage}</p>}
    </div>
  )
}
