import { AppShell } from '../../../components/layout/AppShell'
import { AttendanceCard } from '../components/AttendanceCard'
import { LatestLeaveCard } from '../components/LatestLeaveCard'
import { PayslipCard } from '../components/PayslipCard'
import { useAuthStore } from '../../../stores/authStore'

/**
 * Landing page role EMPLOYEE (Task 9.5) - dirender di "/" kalau user
 * TIDAK punya permission dashboard.view (percabangan di App.tsx).
 * 3 card ringkas (Absensi Hari Ini/Cuti Terakhir/Slip Gaji), TANPA
 * link ke halaman daftar lengkap manapun - route /attendance, /leave,
 * dan daftar slip gaji belum ada (dikonfirmasi investigasi Task 9.5
 * Bagian C: Task 11/12 nanti).
 *
 * Notifikasi SENGAJA tidak dapat card sendiri di sini - reuse ikon
 * lonceng Topbar yang sudah fungsional penuh (opsi eksplisit dari
 * instruksi Bagian B.4), bukan duplikasi UI yang sama.
 */
export function EmployeeHomePage() {
  const employee = useAuthStore((s) => s.employee)

  return (
    <AppShell title={`Halo, ${employee?.full_name ?? 'Karyawan'}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AttendanceCard />
        <LatestLeaveCard />
        <PayslipCard />
      </div>
    </AppShell>
  )
}
