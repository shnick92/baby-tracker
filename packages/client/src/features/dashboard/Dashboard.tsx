import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/axios'
import { AddPasskeyButton } from '../auth/AddPasskeyButton'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const [showAddPasskey, setShowAddPasskey] = useState(false)

  const handleLogout = () => {
    api.post('/api/auth/logout').catch(() => null).finally(() => logout())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Baby Tracker</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Signed in as</p>
          <p className="font-medium text-gray-900 mt-0.5">{user?.name} ({user?.email})</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-sm text-gray-500">Coming soon — tracking features are in progress.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Security</h2>
          {showAddPasskey ? (
            <AddPasskeyButton
              deviceName={`${user?.name}'s device`}
              onSuccess={() => setShowAddPasskey(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddPasskey(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add a passkey (biometric login)
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
