import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '../../../api/endpoints/dashboard'
import type { DashboardSummary } from '../../../api/types/dashboard'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Query key TERMASUK `date` - dipanggil DUA KALI TERPISAH di halaman
 * Dashboard: sekali tanpa date (buat 4 KPI card statis: Karyawan
 * Aktif/Cuti Pending/Payroll/Peringatan Sistem) dan sekali lagi DENGAN
 * date dari AttendanceTodayCard (state date picker lokal komponen itu).
 * 2 query key beda = 2 cache entry independen - ganti tanggal di
 * AttendanceTodayCard cuma invalidate/refetch instance KEDUA, gak
 * nyenggol cache instance pertama sama sekali (isolasi blast radius
 * date picker, sesuai instruksi tugas).
 */
export const dashboardSummaryQueryKey = (date?: string) => ['dashboard-summary', date ?? 'today'] as const

export function useDashboardSummary(date?: string, enabled: boolean = true) {
  return useQuery<DashboardSummary, NormalizedApiError>({
    queryKey: dashboardSummaryQueryKey(date),
    queryFn: () => fetchDashboardSummary(date),
    enabled,
  })
}
