import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { DepartmentListPage } from './features/master-data/pages/DepartmentListPage'
import { PositionListPage } from './features/master-data/pages/PositionListPage'
import { RoleListPage } from './features/master-data/pages/RoleListPage'
import { PermissionMatrixPage } from './features/master-data/pages/PermissionMatrixPage'
import { WorkShiftListPage } from './features/master-data/pages/WorkShiftListPage'
import { OfficeLocationListPage } from './features/master-data/pages/OfficeLocationListPage'
import { SalaryComponentListPage } from './features/master-data/pages/SalaryComponentListPage'
import { EmployeeListPage } from './features/employees/pages/EmployeeListPage'
import { EmployeeArchiveListPage } from './features/employees/pages/EmployeeArchiveListPage'
import { EmployeeFormPlaceholderPage } from './features/employees/pages/EmployeeFormPlaceholderPage'
import { AuditLogListPage } from './features/audit-log/pages/AuditLogListPage'

/**
 * Route '/login' dan '/' final (Langkah 6 + 8). '/departments' (Fase B
 * - pola percontohan), '/positions' (Tugas 2, ngikutin pola Departemen
 * persis), '/roles' + '/roles/:id/permissions' (Tugas 3, List Role +
 * Permission Matrix), '/work-shifts' (Tugas 4, ngikutin pola Departemen/
 * Posisi persis), '/office-locations' (Tugas 5, List + Modal Tab Info/
 * Supervisor), '/payroll/salary-components' (Tugas 6 - path SENGAJA
 * tetap di bawah /payroll/ sesuai Sidebar, meski modulnya "Master Data"),
 * '/employees' + '/employees/archive' (Fase 8b, List utama + Arsip -
 * folder `features/employees/`, BUKAN `features/master-data/`, ngikutin
 * grup "People" di Sidebar) + '/employees/new' & '/employees/:id/edit'
 * (placeholder, form aslinya Fase 8c), dan '/audit-log' (viewer
 * read-only) sudah ada. Route lain (/attendance, dst) MASIH belum
 * dibuat, nunggu giliran masing-masing.
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
        path="/roles/:id/permissions"
        element={
          <ProtectedRoute>
            <PermissionMatrixPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-shifts"
        element={
          <ProtectedRoute>
            <WorkShiftListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/office-locations"
        element={
          <ProtectedRoute>
            <OfficeLocationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/salary-components"
        element={
          <ProtectedRoute>
            <SalaryComponentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <EmployeeListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/archive"
        element={
          <ProtectedRoute>
            <EmployeeArchiveListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/new"
        element={
          <ProtectedRoute>
            <EmployeeFormPlaceholderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id/edit"
        element={
          <ProtectedRoute>
            <EmployeeFormPlaceholderPage />
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
