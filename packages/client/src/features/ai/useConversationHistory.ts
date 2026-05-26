import { useQuery } from '@tanstack/react-query'
import { api } from '@lib/axios'
import { aiKeys } from './queryKeys'

export type HistoryMessage = { role: 'user' | 'assistant'; content: string; createdAt: string }

async function fetchHistory(babyId: string): Promise<HistoryMessage[]> {
  const res = await api.get<{ data: HistoryMessage[]; error: string | null }>(
    `/api/ai/chat/history?babyId=${babyId}`,
  )
  return res.data.data ?? []
}

export function useConversationHistory(babyId: string | null) {
  return useQuery({
    queryKey: aiKeys.chatHistory(babyId ?? ''),
    queryFn: () => fetchHistory(babyId!),
    enabled: !!babyId,
    staleTime: 0,
  })
}
