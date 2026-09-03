import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'
import { DepartmentListPage } from './features/master-data/pages/DepartmentListPage'
import { PositionListPage } from './features/master-data/pages/PositionListPage'
import { RoleListPage } from './features/master-data/pages/RoleListPage'
import { PermissionMatrixPage } from './features/master-data/pages/PermissionMatrixPage'
import { WorkShiftListPage } from './features/master-data/pages/WorkShiftListPage'
import { OfficeLocationListPage } from './features/master-data/pages/OfficeLocationListPage'
import { SalaryComponentListPage } from './features/master-data/pages/SalaryComponentListPage'
import { EmployeeListPage } from './features/employees/pages/EmployeeListPage'
import { EmployeeArchiveListPage } from './features/employees/pages/EmployeeArchiveListPage'
import { EmployeeFormPage } from './features/employees/pages/EmployeeFormPage'
import { EmployeeDetailPage } from './features/employees/pages/EmployeeDetailPage'
import { AuditLogListPage } from './features/audit-log/pages/AuditLogListPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { NotificationListPage } from './features/notifications/pages/NotificationListPage'

/**
 * Route '/login' final (Langkah 6). '/' (Task 7 - Dashboard nyata,
 * KPI cards + chart tren kehadiran, AppShell-nya dirender DI DALAM
 * DashboardPage sendiri, bukan di sini lagi - beda dari waktu masih
 * placeholder verifikasi AppShell Langkah 8). '/departments' (Fase B
 * - pola percontohan), '/positions' (Tugas 2, ngikutin pola Departemen
 * persis), '/roles' + '/roles/:id/permissions' (Tugas 3, List Role +
 * Permission Matrix), '/work-shifts' (Tugas 4, ngikutin pola Departemen/
 * Posisi persis), '/office-locations' (Tugas 5, List + Modal Tab Info/
 * Supervisor), '/payroll/salary-components' (Tugas 6 - path SENGAJA
 * tetap di bawah /payroll/ sesuai Sidebar, meski modulnya "Master Data"),
 * '/employees' + '/employees/archive' (Fase 8b, List utama + Arsip -
 * folder `features/employees/`, BUKAN `features/master-data/`, ngikutin
 * grup "People" di Sidebar) + '/employees/new' & '/employees/:id/edit'
 * (Fase 8c, Form Tambah/Edit - 1 komponen shared, FormData/multipart
 * karena ada upload foto), dan '/audit-log' (viewer read-only) sudah
 * ada. Route lain (/attendance, dst) MASIH belum dibuat, nunggu giliran
 * masing-masing.
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
            <DashboardPage />
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
            <EmployeeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id/edit"
        element={
          <ProtectedRoute>
            <EmployeeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute>
            <EmployeeDetailPage />
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
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationListPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
