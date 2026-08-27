import { apiClient } from '../client'
import type { DashboardSummary, AttendanceTrendData } from '../types/dashboard'

/**
 * GET /dashboard/summary - `date` opsional (YYYY-MM-DD), default
 * backend hari ini kalau gak dikirim. CUMA memengaruhi
 * `attendance_today` di response, bukan field lain (lihat catatan di
 * api/types/dashboard.ts).
 */
export async function fetchDashboardSummary(date?: string): Promise<DashboardSummary> {
  const res = await apiClient.get<{ success: true; message: string; data: DashboardSummary }>('/dashboard/summary', {
    params: date ? { date } : undefined,
  })
  return res.data.data
}

/** GET /dashboard/attendance-trend?days=N - backend clamp 1-90, tren harian N hari terakhir termasuk hari ini. */
export async function fetchAttendanceTrend(days: number): Promise<AttendanceTrendData> {
  const res = await apiClient.get<{ success: true; message: string; period: AttendanceTrendData['period']; data: AttendanceTrendData['data'] }>(
    '/dashboard/attendance-trend',
    { params: { days } }
  )
  return { period: res.data.period, data: res.data.data }
}
