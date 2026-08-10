import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { DepartmentListPage } from './features/master-data/pages/DepartmentListPage'

/**
 * Route '/login' dan '/' final (Langkah 6 + 8). '/departments' BARU
 * (Fase B - pola percontohan). Route Master Data lain (/employees,
 * /attendance, dst - yang sudah dirujuk Sidebar) MASIH belum dibuat,
 * nunggu giliran masing-masing.
 */
function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

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
            <AppShell title="Dashboard">
              <DashboardPlaceholder />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentListPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

/** Placeholder konten - halaman Dashboard beneran itu Fase C, belum dikerjakan. Cuma buat verifikasi AppShell jalan. */
function DashboardPlaceholder() {
  return (
    <p className="font-body text-sm text-neutral-600">
      Konten Dashboard akan dibangun di Fase C. Halaman ini cuma verifikasi AppShell (Langkah 8).
    </p>
  )
}

export default App
