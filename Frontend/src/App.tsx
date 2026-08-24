import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { DepartmentListPage } from './features/master-data/pages/DepartmentListPage'
import { PositionListPage } from './features/master-data/pages/PositionListPage'
import { RoleListPage } from './features/master-data/pages/RoleListPage'
import { AuditLogListPage } from './features/audit-log/pages/AuditLogListPage'

/**
 * Route '/login' dan '/' final (Langkah 6 + 8). '/departments' (Fase B
 * - pola percontohan), '/positions' (Tugas 2, ngikutin pola Departemen
 * persis), '/roles' (Tugas 3, List Role - Matrix Permission-nya nyusul
 * di /roles/:id/permissions), dan '/audit-log' (viewer read-only) sudah ada.
 * Route Master Data lain (/employees, /attendance, dst - yang sudah
 * dirujuk Sidebar) MASIH belum dibuat, nunggu giliran masing-masing.
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
      <Route
        path="/positions"
        element={
          <ProtectedRoute>
            <PositionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RoleListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogListPage />
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
