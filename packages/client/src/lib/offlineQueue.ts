export type QueuedMutation = {
  id: string
  url: string
  method: 'POST'
  body: Record<string, unknown>
  queuedAt: number
}

const DB_NAME = 'tracker-offline-queue'
const STORE_NAME = 'mutations'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueOffline(url: string, body: Record<string, unknown>): Promise<void> {
  const db = await openDb()
  const item: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method: 'POST',
    body,
    queuedAt: Date.now(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () =>
      resolve(
        (req.result as QueuedMutation[]).sort((a, b) => a.queuedAt - b.queuedAt),
      )
    req.onerror = () => reject(req.error)
  })
}

export async function dequeueById(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueueCount(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).count()
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export function isOfflineError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    return (error as { response?: unknown }).response === undefined
  }
  return false
}
