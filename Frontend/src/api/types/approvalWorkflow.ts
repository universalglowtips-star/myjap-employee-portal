import type { Employee } from './employee'
import type { Role } from './role'

/**
 * Verifikasi: database/migrations (approval_workflows/approval_workflow_steps)
 * + app/Models/ApprovalWorkflow.php + ApprovalWorkflowStep.php +
 * ApprovalWorkflowController.php (investigasi Task 14 Fase 1). Engine ini
 * HARDCODE ke Payroll (applies_to_period_type = period_type milik
 * PayrollPeriod), BUKAN polymorphic/generic - tidak ada approvable_type/
 * approvable_id di skema manapun.
 */
export type PeriodType = 'REGULAR' | 'THR' | 'BONUS' | 'OFF_CYCLE' | 'CORRECTION'

/**
 * restrict_to_office_location balik sebagai NUMBER (0/1) dari backend,
 * BUKAN boolean asli - ApprovalWorkflowStep.php TIDAK punya casts() sama
 * sekali (dikonfirmasi baca model langsung). JANGAN dipakai lewat pola
 * `value && <JSX>` - React me-render literal "0" (falsy tapi tetap valid
 * ReactNode). Sudah kejadian nyata di ApprovalTimeline.tsx (Task 13
 * koreksi) - pola fix yang sama (Boolean(Number(value)) / ternary ke null)
 * berlaku di sini juga.
 */
export interface ApprovalWorkflowStep {
  id: number
  approval_workflow_id: number
  level: number
  approver_role_id: number
  restrict_to_office_location: boolean | 0 | 1
  approver_role?: Role
}

export interface ApprovalWorkflow {
  id: number
  name: string
  applies_to_period_type: PeriodType
  is_active: boolean
  created_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  steps?: ApprovalWorkflowStep[]
  creator?: Employee | null
}

export interface ApprovalWorkflowListResponse {
  success: true
  message: string
  total: number
  data: ApprovalWorkflow[]
}

export interface ApprovalWorkflowQueryParams {
  period_type?: string
  is_active?: boolean
}

export interface ApprovalWorkflowStepInput {
  level: number
  approver_role_id: number
  restrict_to_office_location: boolean
}

/**
 * store() validate(): name required, applies_to_period_type required
 * (in:REGULAR,THR,BONUS,OFF_CYCLE,CORRECTION), is_active boolean opsional,
 * steps required|array|min:1. validateSteps() tambahan: level harus
 * 1,2,3,... berurutan tanpa lompat/duplikat, approver_role_id cuma boleh
 * role MANAGER/FINANCE/HRD (SUPER_ADMIN eksplisit ditolak jadi approver).
 */
export interface ApprovalWorkflowCreateRequest {
  name: string
  applies_to_period_type: PeriodType
  is_active?: boolean
  steps: ApprovalWorkflowStepInput[]
}

/**
 * update() validate(): name/is_active/steps semua 'sometimes' (opsional).
 * applies_to_period_type TIDAK ADA di validate() update() sama sekali -
 * dikonfirmasi baca kode langsung, backend TIDAK menerima perubahan field
 * ini setelah dibuat. steps (kalau dikirim) replace-all: backend hapus
 * semua step lama, insert baru dari nol - aman karena payroll_approvals
 * simpan snapshot approver_role_id/restrict_to_office_location sendiri.
 */
export interface ApprovalWorkflowUpdateRequest {
  name?: string
  is_active?: boolean
  steps?: ApprovalWorkflowStepInput[]
}
