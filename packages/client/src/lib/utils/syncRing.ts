import type { SocketStatus } from '@tracker/shared'

// Maps socket status to the .sync-ring classes defined in index.css.
// Used by every avatar that shows connection state (AppLayout, Dashboard).
export function syncRingClass(status: SocketStatus): string {
  return `sync-ring ${status === 'synced' ? 'synced' : status === 'unsynced' ? 'unsynced' : 'connecting'}`
}
