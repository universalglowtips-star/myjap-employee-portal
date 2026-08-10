import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useIsAuthenticated } from '../stores/authStore'

/**
 * Bungkus route yang butuh login. TIDAK cek permission apapun di
 * sini (itu tanggung jawab PermissionGate per-halaman, Langkah 4) -
 * ProtectedRoute cuma soal "sudah login atau belum".
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const isRestoring = useAuthStore((s) => s.isRestoring)
  const location = useLocation()

  // Selama restoreSession() masih jalan (app baru dibuka, GET /me
  // belum kelar) - JANGAN redirect dulu, karena bisa aja token
  // sebenarnya valid. Redirect prematur di sini bakal bikin user
  // ke-flash ke /login sepersekian detik tiap refresh halaman.
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="font-body text-neutral-600 text-sm">Memuat sesi...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // state 'from' disimpan biar nanti (Langkah 6, Login page) bisa
    // redirect balik ke halaman yang tadinya mau dibuka setelah login sukses.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
