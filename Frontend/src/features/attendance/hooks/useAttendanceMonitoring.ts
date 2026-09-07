import { useQuery } from '@tanstack/react-query'
import { fetchAttendances } from '../../../api/endpoints/attendance'
import type { Attendance } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

export interface AttendanceMonitoringFilters {
  startDate: string
  endDate: string
  officeLocationId: string
  employeeId: string
}

/** UTC-based, konsisten sama todayDateString() di hook Riwayat Absensi (Task 9.5b). */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Default "Dari Tanggal" - tanggal 1 bulan berjalan (Task 10 Bagian A.1). */
export function firstDayOfMonthString(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

const FETCH_ALL_PAGE_SIZE = 2000

/**
 * Ambil SEMUA baris yang cocok filter, gak cuma 1 halaman - loop
 * `page` sampai `current_page >= last_page` (dikonfirmasi investigasi
 * Task 10: GET /attendances gak punya batas per_page server-side sama
 * sekali, jadi aman diminta per_page besar). per_page=2000 dipilih
 * biar skala ~6000 baris (patokan investigasi: ~200 karyawan x 30
 * hari) muat dalam 3 request, masih di rentang "1-5 request" yang
 * dianggap wajar - BUKAN 1 request per_page=6000 sekaligus, biar gak
 * ada 1 request tunggal yang terlalu besar/lama kalau datanya lebih
 * banyak dari perkiraan, dan BUKAN batasi ke N halaman - benar-benar
 * ambil semua, gak peduli seberapa besar rentang tanggal yang dipilih
 * admin.
 */
async function fetchAllMatchingAttendances(filters: AttendanceMonitoringFilters): Promise<Attendance[]> {
  const baseParams = {
    start_date: filters.startDate,
    end_date: filters.endDate,
    office_location_id: filters.officeLocationId ? Number(filters.officeLocationId) : undefined,
    employee_id: filters.employeeId ? Number(filters.employeeId) : undefined,
  }

  let page = 1
  const all: Attendance[] = []

  while (true) {
    const res = await fetchAttendances({ ...baseParams, per_page: FETCH_ALL_PAGE_SIZE, page })
    all.push(...res.data)
    if (page >= res.pagination.last_page) break
    page++
  }

  return all
}

export function attendanceMonitoringQueryKey(filters: AttendanceMonitoringFilters) {
  return ['attendance-monitoring', filters.startDate, filters.endDate, filters.officeLocationId, filters.employeeId] as const
}

/**
 * Data mentah admin monitoring (Task 10) - SEMUA baris yang cocok
 * filter (bukan server-paginated), dipakai bareng buat KEDUA tab:
 * Tab "Rincian Harian" nge-paginate array ini di client (bukan minta
 * halaman baru ke server tiap ganti halaman), Tab "Ringkasan per
 * Karyawan" agregasi array ini penuh, dan tombol Ekspor baca array
 * yang sama persis buat kedua tab - satu fetch, tiga pemakaian,
 * konsisten WYSIWYG (apa yang difilter itu yang ter-export).
 * ScopesOwnData backend TIDAK aktif buat role non-EMPLOYEE (dikonfirmasi
 * investigasi Task 10) - endpoint ini otomatis balikin data SEMUA
 * karyawan buat DIRECTOR/MANAGER/HRD/SUPER_ADMIN, gak perlu logic
 * tambahan di sini.
 */
export function useAttendanceMonitoring(filters: AttendanceMonitoringFilters, enabled: boolean = true) {
  return useQuery<Attendance[], NormalizedApiError>({
    queryKey: attendanceMonitoringQueryKey(filters),
    queryFn: () => fetchAllMatchingAttendances(filters),
    enabled,
  })
}
