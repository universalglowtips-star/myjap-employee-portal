import { Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { KpiCard } from '../components/KpiCard'
import { AttendanceTodayCard } from '../components/AttendanceTodayCard'
import { AttendanceTrendChart } from '../components/AttendanceTrendChart'

/**
 * Task 7 - ganti DashboardPlaceholder (App.tsx) jadi halaman nyata.
 * SENGAJA cuma pakai 2 endpoint (dashboard/summary, dashboard/
 * attendance-trend) - payslips-summary & payroll-periods TIDAK
 * dipanggil di sini meski sama-sama permission dashboard.view
 * (dikonfirmasi dari investigasi backend sebelumnya), itu scope
 * Task 12/13 nanti.
 *
 * useDashboardSummary() di SINI (tanpa date) cuma buat 4 KPI card
 * statis (Karyawan Aktif/Cuti Pending/Payroll/Peringatan Sistem) -
 * card "Kehadiran Hari Ini" fetch TERPISAH lewat AttendanceTodayCard
 * sendiri (query key beda, punya date picker sendiri), biar ganti
 * tanggal di situ gak nyenggol 4 card lain sama sekali.
 */
export function DashboardPage() {
  const canView = usePermission('dashboard.view')
  const { data: summary, isLoading, isError } = useDashboardSummary(undefined, canView)

  return (
    <AppShell title="Dashboard">
      <PermissionGate
        code="dashboard.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        <p className="mb-6 font-body text-sm text-neutral-600">Menampilkan data agregat seluruh cabang perusahaan</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="Karyawan Aktif" isLoading={isLoading} isError={isError}>
            <p className="font-display text-2xl font-semibold text-neutral-900">{summary?.employees.total_active}</p>
          </KpiCard>

          <AttendanceTodayCard />

          <KpiCard title="Cuti Pending" isLoading={isLoading} isError={isError}>
            <p className="font-display text-2xl font-semibold text-neutral-900">{summary?.leave.pending_count}</p>
          </KpiCard>

          <KpiCard title="Payroll Bulan Ini" isLoading={isLoading} isError={isError}>
            <p className="font-display text-xl font-semibold text-neutral-900">
              {summary ? formatCurrency(summary.payroll_this_month.total_net_salary) : '-'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-body text-xs text-neutral-600">
              <span>{summary?.payroll_this_month.total_payslips ?? 0} slip</span>
              <span>{summary?.payroll_this_month.draft_count ?? 0} draft</span>
              <span>{summary?.payroll_this_month.published_count ?? 0} terbit</span>
            </div>
          </KpiCard>

          {/* Peringatan Sistem - ANGKA SAJA, sengaja TIDAK ADA link/onClick/
              navigasi apa pun (belum ada halaman detail buat ini). */}
          <KpiCard title="Peringatan Sistem" isLoading={isLoading} isError={isError}>
            <p
              className={
                summary && summary.system_warnings.unresolved_count > 0
                  ? 'font-display text-2xl font-semibold text-status-pending'
                  : 'font-display text-2xl font-semibold text-neutral-900'
              }
            >
              {summary?.system_warnings.unresolved_count}
            </p>
          </KpiCard>
        </div>

        <div className="mt-6">
          <AttendanceTrendChart />
        </div>
      </PermissionGate>
    </AppShell>
  )
}
