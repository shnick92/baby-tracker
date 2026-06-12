import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/axios'

export type PasskeyCredential = {
  id: string
  deviceName: string | null
  createdAt: string
  lastUsedAt: string | null
}

const passkeysKey = ['passkeys'] as const

export function usePasskeys(enabled = true) {
  return useQuery({
    queryKey: passkeysKey,
    enabled,
    queryFn: () =>
      api
        .get<{ data: PasskeyCredential[]; error: null }>('/api/auth/passkey/credentials')
        .then((r) => r.data.data),
  })
}

export function useRemovePasskey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/passkey/credentials/${id}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: passkeysKey }),
  })
}
