import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { getQueue, dequeueById, getQueueCount } from '@lib/offlineQueue'
import { useSocketStore } from '@stores/socketStore'

export function useOfflineSync(babyId: string) {
  const queryClient = useQueryClient()
  const setQueueCount = useSocketStore((s) => s.setOfflineQueueCount)

  const refreshCount = useCallback(async () => {
    const count = await getQueueCount()
    setQueueCount(count)
  }, [setQueueCount])

  const replayQueue = useCallback(async () => {
    const queue = await getQueue()
    if (queue.length === 0) return

    for (const item of queue) {
      try {
        await api({ method: item.method, url: item.url, data: item.body })
        await dequeueById(item.id)
      } catch {
        break
      }
    }

    await refreshCount()
    queryClient.invalidateQueries({ queryKey: ['feedings', babyId] })
    queryClient.invalidateQueries({ queryKey: ['diaper', babyId] })
    queryClient.invalidateQueries({ queryKey: ['sleep', babyId] })
  }, [babyId, queryClient, refreshCount])

  useEffect(() => {
    void refreshCount()

    const socket = getSocket()
    socket.on('connect', replayQueue)
    window.addEventListener('online', replayQueue)

    return () => {
      socket.off('connect', replayQueue)
      window.removeEventListener('online', replayQueue)
    }
  }, [replayQueue, refreshCount])
}
