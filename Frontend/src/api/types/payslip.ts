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
  search?: string
  per_page?: number
  page?: number
}
