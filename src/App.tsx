import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'

/**
 * Placeholder verifikasi Langkah 1-3 di route '/' - BUKAN routing
 * final. Diganti AppShell+halaman beneran pas Langkah 8+.
 * Route '/login' SUDAH final (Langkah 6).
 */
function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

  // Restore session SEKALI di awal app dibuka - baca token dari
  // localStorage (via persist middleware authStore), validasi ke
  // GET /me. Ini yang bikin "tetap login setelah refresh" jalan.
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TokenVerificationPlaceholder />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

/** Sisa placeholder Langkah 1 - verifikasi token warna/font masih kepasang. */
function TokenVerificationPlaceholder() {
  return (
    <div className="min-h-screen bg-neutral-50 p-8 flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-neutral-900">
        Token Verification
      </h1>
      <div className="flex gap-3">
        <div className="w-24 h-16 rounded-md bg-primary-600 flex items-center justify-center text-white text-xs font-body">
          primary
        </div>
        <div className="w-24 h-16 rounded-md bg-sidebar flex items-center justify-center text-white text-xs font-body">
          sidebar
        </div>
        <div className="w-24 h-16 rounded-md bg-accent-500 flex items-center justify-center text-white text-xs font-body">
          accent
        </div>
      </div>
      <p className="font-body text-neutral-600">
        Inter (body) — Rp <span className="font-mono">7.000.000</span> (JetBrains Mono)
      </p>
    </div>
  )
}

export default App
