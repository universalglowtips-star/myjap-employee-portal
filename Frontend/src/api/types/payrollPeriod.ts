import type { Employee } from './employee'
import type { OfficeLocation } from './officeLocation'
import type { Role } from './role'
import type { Payslip } from './payslip'

/**
 * Verifikasi: database/migrations/2026_08_01_090000_create_payroll_periods_table.php
 * + 2026_08_03_090002_add_approval_fields_to_payroll_periods_table.php +
 * 2026_08_03_090005_add_office_location_to_payroll_periods.php +
 * app/Models/PayrollPeriod.php + PayrollPeriodController.php (Task 13
 * investigasi). period_type dan status SENGAJA string polos di backend
 * (bukan DB enum) - dibiarkan `string` di sini juga, BUKAN union literal,
 * biar gak pecah kalau backend nambah nilai baru tanpa migration
 * (komentar migration eksplisit soal ini).
 */
export const PERIOD_TYPE_OPTIONS = [
  { value: 'REGULAR', label: 'Reguler' },
  { value: 'THR', label: 'THR' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'OFF_CYCLE', label: 'Off-Cycle' },
  { value: 'CORRECTION', label: 'Koreksi' },
] as const

/** Baris payroll_approvals - riwayat approval per level per submission_cycle. status 'Rejected' HANYA muncul di sini (di level PayrollPeriod sendiri, reject balikin status ke 'Draft', bukan 'Rejected' - lihat PayrollPeriodController::reject()). */
export interface PayrollApproval {
  id: number
  payroll_period_id: number
  submission_cycle: number
  level: number
  approver_role_id: number
  restrict_to_office_location: boolean
  status: 'Pending' | 'Approved' | 'Rejected'
  acted_by: number | null
  acted_at: string | null
  notes: string | null
  approver_role?: Role
  actor?: Employee | null
}

/** approval_workflow_steps - konfigurasi level, READ-ONLY dari sisi Task 13 (create/edit/delete step itu Task 14, approval-workflow.* permission, TIDAK disentuh di sini sama sekali). */
export interface ApprovalWorkflowStep {
  id: number
  approval_workflow_id: number
  level: number
  approver_role_id: number
  restrict_to_office_location: boolean
  approver_role?: Role
}

export interface ApprovalWorkflow {
  id: number
  name: string
  applies_to_period_type: string
  is_active: boolean
  steps?: ApprovalWorkflowStep[]
}

export interface PayrollPeriod {
  id: number
  period_code: string
  period_type: string
  office_location_id: number | null
  approval_workflow_id: number | null
  period_start: string
  period_end: string
  pay_date: string | null
  status: string
  submission_cycle: number
  current_approval_level: number | null
  submitted_at: string | null
  submitted_by: number | null
  locked: boolean
  published_at: string | null
  published_by: number | null
  created_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** withCount('payslips') di index() - cuma ada di respons list. */
  payslips_count?: number
  /** Snake_case, BUKAN officeLocation - Eloquent relation officeLocation() di-serialize Laravel jadi key snake_case di JSON, terlepas dari nama method-nya camelCase (dikonfirmasi live via curl, bukan asumsi - lihat [[feedback_verify_enums_live]]). */
  office_location?: OfficeLocation | null
  /** Snake_case, BUKAN approvalWorkflow - alasan sama persis office_location di atas. */
  approval_workflow?: ApprovalWorkflow | null
  approvals?: PayrollApproval[]
  payslips?: Payslip[]
  creator?: Employee | null
  publisher?: Employee | null
  submitter?: Employee | null
  /**
   * Cuma ada di respons submit()/approve() (bukan show()/index()) -
   * approvals cycle SEKARANG SAJA, sudah difilter backend. Untuk show(),
   * pakai summary.approval_history_by_cycle (dikelompokkan semua cycle).
   */
  current_cycle_approvals?: PayrollApproval[]
}

export interface PayrollPeriodListResponse {
  success: true
  message: string
  total: number
  data: PayrollPeriod[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

export interface PayrollPeriodQueryParams {
  period_type?: string
  office_location_id?: number
  status?: string
  year?: number
  per_page?: number
  page?: number
}

/**
 * summary di show() dihitung dari Collection PHP ($period->payslips->sum(...))
 * - hasil operasi numerik PHP di-json_encode sebagai NUMBER, BUKAN string
 * (beda dari field net_salary/gross_earning/total_deduction per-payslip
 * individual yang eksplisit di-cast decimal:2 -> string di model Payslip).
 */
export interface PayrollPeriodSummary {
  total_payslips: number
  total_net_salary: number
  total_gross_earning: number
  total_deduction: number
  draft_count: number
  published_count: number
  /** Key = submission_cycle (string angka dari JSON object key), diurutkan ASC oleh backend (->sortKeys()). */
  approval_history_by_cycle: Record<string, PayrollApproval[]>
}

export interface PayrollPeriodDetailResponse {
  success: true
  message: string
  data: PayrollPeriod
  summary: PayrollPeriodSummary
}
