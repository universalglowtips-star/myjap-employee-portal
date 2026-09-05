import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { usePermission } from './lib/permissions'
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
import { EmployeeHomePage } from './features/employee-home/pages/EmployeeHomePage'
import { NotificationListPage } from './features/notifications/pages/NotificationListPage'
import { AttendanceHistoryPage } from './features/attendance/pages/AttendanceHistoryPage'

/**
 * Percabangan halaman "/" (Task 9.5 Bagian A): DashboardPage kalau
 * punya permission dashboard.view (role admin/manajerial), kalau
 * TIDAK render EmployeeHomePage (role EMPLOYEE). Sebelumnya "/"
 * SELALU render DashboardPage tanpa syarat - EMPLOYEE yang login
 * mentok di pesan "akses ditolak" (PermissionGate di dalam
 * DashboardPage sendiri), dikonfirmasi investigasi sebelumnya. Logic
 * percabangan HARUS ada di komponen terpisah (bukan langsung di JSX
 * Route) karena butuh manggil hook usePermission.
 */
function HomeRoute() {
  const canViewDashboard = usePermission('dashboard.view')
  return canViewDashboard ? <DashboardPage /> : <EmployeeHomePage />
}

/**
 * Percabangan "/attendance" (Task 9.5b Bagian A) - pola SAMA PERSIS
 * HomeRoute di atas. Versi EMPLOYEE (riwayat absensi 90 hari milik
 * sendiri, AttendanceHistoryPage) dibangun SEKARANG; versi admin
 * (monitoring semua karyawan) BELUM - placeholder sederhana dulu,
 * dibangun terpisah di Task 10 (URL sama, cuma component-nya diganti
 * nanti). Dicek pakai dashboard.view (BUKAN attendance.view yang
 * dipakai Sidebar buat nampilin nav item-nya) - dashboard.view yang
 * jadi pembeda role admin/manajerial vs EMPLOYEE di seluruh app ini
 * (persis sama kayak HomeRoute), sesuai instruksi eksplisit tugas.
 */
function AttendanceRoute() {
  const canViewDashboard = usePermission('dashboard.view')
  return canViewDashboard ? (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 text-center">
      <p className="font-body text-sm text-neutral-600">Halaman monitoring absensi akan dibangun di Task 10.</p>
    </div>
  ) : (
    <AttendanceHistoryPage />
  )
}

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
 * karena ada upload foto), '/audit-log' (viewer read-only), '/notifications'
 * (Task 9), dan '/attendance' (Task 9.5b - riwayat pribadi EMPLOYEE,
 * placeholder buat admin nunggu Task 10) sudah ada. Route lain masih
 * belum dibuat, nunggu giliran masing-masing.
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
            <HomeRoute />
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
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AttendanceRoute />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
