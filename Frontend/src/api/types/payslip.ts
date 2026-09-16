import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/Payslip.php + migration
 * 2026_07_23_125621_create_payslips_table.php (dibaca ulang sesi
 * investigasi Task 9.5). net_salary/gross_earning/total_deduction:
 * decimal:2 di $casts eksplisit model -> balik sebagai STRING (pola
 * sama Employee.basic_salary), BUKAN number.
 *
 * Field lengkap (bukan cuma yang dipakai Card Employee Home) - biar
 * type ini reusable buat halaman daftar slip gaji nanti (Task 12).
 */
/** payslip_items - breakdown per-komponen, SNAPSHOT (component_code/name/type dibekukan saat item dibuat, gak ikut berubah kalau salary_components aslinya di-rename belakangan) - ambil field ini langsung, JANGAN join live ke salaryComponent buat nampilin nama/tipe. */
export interface PayslipItem {
  id: number
  payslip_id: number
  salary_component_id: number
  component_code: string
  component_name: string
  component_type: 'earning' | 'deduction'
  amount: string
  /**
   * Task 15b (gap Fase 2 C.6+E.3, ditutup belakangan) - rate x quantity
   * yang DIPAKAI generateBulk() buat hasilin amount ini, CUMA terisi
   * buat item kategori scheduled_variable. NULL buat item fixed/situational
   * (gak ada konsep perkalian) DAN buat semua item lama yang dibuat
   * sebelum kolom ini ada (termasuk 6 payslip Published pertama) -
   * kolom nullable non-destruktif, bukan di-backfill.
   */
  rate: string | null
  quantity: string | null
  sort_order: number
  notes: string | null
}

export interface Payslip {
  id: number
  payroll_period_id: number | null
  employee_id: number
  department_id: number | null
  office_location_id: number | null
  month: number
  year: number
  gross_earning: string
  total_deduction: string
  net_salary: string
  status: 'Draft' | 'Published'
  file_pdf: string | null
  published_by: number | null
  published_at: string | null
  unpublish_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  employee?: Employee
  items?: PayslipItem[]
}

export interface PayslipListResponse {
  success: true
  message: string
  total: number
  data: Payslip[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

export interface PayslipQueryParams {
  employee_id?: number
  month?: number
  year?: number
  status?: string
  department_id?: number
  /** Filter langsung ke kolom office_location_id milik payslips sendiri (snapshot cabang saat payslip dibuat) - ditambahkan sesi follow-up terpisah dari Task 12 utama, setelah disetujui eksplisit. */
  office_location_id?: number
  search?: string
  per_page?: number
  page?: number
}

export interface PayslipDetailResponse {
  success: true
  message: string
  data: Payslip
}

/**
 * PUT /payslips/{id} - verifikasi PayslipController::update(). Kirim
 * `items` = FULL REPLACE (backend delete() semua item lama lalu
 * insert ulang dari array ini, recompute gross_earning/total_deduction/
 * net_salary dari total array baru) - BUKAN partial/append. Task 15b
 * pakai ini buat nambah item Situasional: WAJIB fetch payslip TERBARU
 * (GET /payslips/{id}) sesaat sebelum submit, gabung item existing +
 * item baru, baru PUT - JANGAN pakai state/cache lama dari hasil
 * generate awal (race condition => kehilangan item lain yang mungkin
 * udah ditambah user lain/tab lain duluan).
 */
export interface UpdatePayslipRequest {
  items: Array<{
    salary_component_id: number
    amount: number
    /** Task 15b - WAJIB dikirim balik utuh buat item scheduled_variable existing, karena update() full-replace seluruh items - kalau di-skip, breakdown formula item itu hilang (rate/quantity balik null). */
    rate?: number | null
    quantity?: number | null
    notes?: string | null
  }>
}

/**
 * POST /payroll/generate-bulk - verifikasi PayslipController::generateBulk()
 * (ditulis ulang total Task 15b). month/year SAJA (payroll_period_id
 * detail internal - backend resolve/bikin PayrollPeriod per cabang
 * sendiri lewat findOrCreateRegular()). SATU panggilan ini BISA
 * menyentuh BEBERAPA periode sekaligus (1 per cabang yang punya
 * karyawan aktif), TIDAK cuma periode yang lagi dibuka di halaman
 * Detail Periode - `periods[]` di respons mencantumkan semua yang
 * kesentuh.
 */
export interface GenerateBulkRequest {
  month: number
  year: number
}

export interface GenerateBulkResponse {
  success: true
  message: string
  periods: Array<{ id: number; period_code: string; office_location_id: number | null }>
  total_created: number
  total_skipped: number
  created_payslip_ids: number[]
  skipped_employee_ids: number[]
}

/**
 * 422 dari generateBulk() - pre-flight quantity check GAGAL (bukan
 * error umum). Dikembalikan SEBELUM ada payslip apapun disentuh -
 * daftar ini persis kombinasi employee+komponen yang belum diisi
 * "Jumlah"-nya lewat PUT payroll-periods/{id}/quantities.
 */
export interface GenerateBulkMissingQuantitiesError {
  success: false
  message: string
  missing_quantities: Array<{
    employee_id: number
    employee_name: string
    salary_component_id: number
    salary_component_name: string
    payroll_period_id: number
    period_code: string
  }>
  total_missing: number
}

/** POST /payroll/publish-bulk - verifikasi PayslipController::publishBulk(). period_code ATAU month+year (+office_location_id opsional). */
export interface PublishBulkRequest {
  period_code?: string
  month?: number
  year?: number
  office_location_id?: number
}

export interface PublishBulkResponse {
  success: boolean
  message: string
  total_periods_processed: number
  periods: Array<{
    period_id: number
    period_code: string
    office_location_id: number | null
    success: boolean
    message: string
    total_published: number
    total_failed: number
    published_payslip_ids?: number[]
    failed_payslip_ids?: number[]
  }>
}
