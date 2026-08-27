/**
 * Verifikasi: app/Http/Controllers/Api/DashboardController.php (dibaca
 * langsung, plus di-hit via curl asli - Task 7 investigasi sesi
 * terpisah sebelumnya) - bukan ditebak dari nama field.
 *
 * `date` (query param opsional di summary()) CUMA memengaruhi
 * `attendance_today` - `payroll_this_month` SELALU bulan berjalan
 * (`now()->month/year` backend, bukan parameter), tidak bisa
 * di-override. `total_net_salary` balik sebagai number mentah (bukan
 * string) - dikonfirmasi dari response curl asli, meski kolom
 * `net_salary` sumbernya decimal.
 */
export interface DashboardSummary {
  date: string
  employees: {
    total_active: number
  }
  attendance_today: {
    present: number
    late: number
    on_leave: number
    absent: number
    not_checked_in: number
  }
  leave: {
    pending_count: number
  }
  payroll_this_month: {
    month: number
    year: number
    total_payslips: number
    draft_count: number
    published_count: number
    total_net_salary: number
  }
  system_warnings: {
    unresolved_count: number
  }
}

/**
 * Granularitas HARIAN (dikonfirmasi dari loop backend, bukan asumsi
 * dari nama endpoint) - 1 objek per hari kalender. `days` dibatasi
 * backend ke rentang 1-90 (`min(max($days,1),90)`).
 */
export interface AttendanceTrendPoint {
  date: string
  present: number
  late: number
  on_leave: number
  absent: number
}

export interface AttendanceTrendData {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  data: AttendanceTrendPoint[]
}
