import { useQuery } from '@tanstack/react-query'
import { fetchAttendances } from '../../../api/endpoints/attendance'
import type { Attendance } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

/** UTC-based - konsisten sama todayDateString() di AttendanceTodayCard.tsx (Dashboard admin) dan app.timezone backend yang UTC, bukan timezone lokal browser. */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export const todayAttendanceQueryKey = () => ['today-attendance', todayDateString()] as const

/**
 * GET /attendances?start_date=end_date=hari ini - ScopesOwnData
 * backend otomatis batasin ke absensi milik sendiri (role EMPLOYEE),
 * TIDAK perlu kirim employee_id manual. Constraint unique
 * (employee_id+attendance_date) di backend mastiin hasilnya MAX 1
 * baris - ambil item pertama aja (atau null kalau belum absen sama
 * sekali hari ini), bukan array.
 */
export function useTodayAttendance(enabled: boolean = true) {
  const date = todayDateString()
  return useQuery<Attendance | null, NormalizedApiError>({
    queryKey: todayAttendanceQueryKey(),
    queryFn: async () => {
      const res = await fetchAttendances({ start_date: date, end_date: date, per_page: 1 })
      return res.data[0] ?? null
    },
    enabled,
  })
}
