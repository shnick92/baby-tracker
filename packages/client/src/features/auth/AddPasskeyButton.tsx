import { useMutation } from '@tanstack/react-query'
import { startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'
import { api } from '@lib/axios'

interface Props {
  deviceName?: string
  onSuccess?: () => void
}

export function AddPasskeyButton({ deviceName, onSuccess }: Props) {
  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: async () => {
      const { data: optRes } = await api.post<{
        data: PublicKeyCredentialCreationOptionsJSON
        error: null
      }>('/api/auth/passkey/register/options')

      const regResponse = await startRegistration({ optionsJSON: optRes.data })

      await api.post('/api/auth/passkey/register/verify', {
        response: regResponse,
        deviceName,
      })
    },
    onSuccess,
  })

  const errorMessage = (() => {
    if (!error) return null
    if (error instanceof Error && error.name === 'NotAllowedError') return null
    return 'Could not register passkey. Please try again.'
  })()

  if (isSuccess) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
        Passkey added — you can now sign in with biometrics.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => mutate()}
        disabled={isPending}
        className="w-full py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
        {isPending ? 'Waiting for biometric…' : 'Add passkey'}
      </button>
      {errorMessage && <p className="text-xs text-center text-red-600">{errorMessage}</p>}
    </div>
  )
}
