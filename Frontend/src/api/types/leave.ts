import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/Leave.php + migration
 * 2026_07_22_134153_create_leaves_table.php + migration fix enum
 * 2026_07_26_100000 (leave_type: "Sick" -> "Sick Leave") + migration
 * 2026_07_26_110000 (status +"Cancelled", +cancelled_by/cancelled_at/
 * cancel_reason) + LeaveController (dibaca ulang sesi investigasi
 * Task 11 - 6 nilai leave_type dan 4 nilai status dikonfirmasi
 * LANGSUNG dari `SHOW COLUMNS FROM leaves`, bukan diasumsikan dari
 * migration saja).
 */
export interface Leave {
  id: number
  employee_id: number
  leave_type: 'Annual Leave' | 'Sick Leave' | 'Permission' | 'Maternity Leave' | 'Unpaid Leave' | 'Business Trip'
  start_date: string
  end_date: string
  total_days: number
  reason: string
  attachment: string | null
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  approved_by: number | null
  approved_at: string | null
  approval_notes: string | null
  cancelled_by: number | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  employee?: Employee
  approver?: Employee
  canceller?: Employee
}

export interface LeaveListResponse {
  success: true
  message: string
  total: number
  data: Leave[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

export interface LeaveQueryParams {
  employee_id?: number
  status?: string
  leave_type?: string
  start_date?: string
  end_date?: string
  search?: string
  per_page?: number
  page?: number
}

export type LeaveType = Leave['leave_type']

/** GET /leaves/quota - dihitung on-the-fly di backend, BUKAN state tersimpan (lihat komentar LeaveController::quota()). */
export interface LeaveQuota {
  employee_id: number
  year: number
  quota: number
  used: number
  remaining: number
}

export interface LeaveQuotaResponse {
  success: true
  message: string
  data: LeaveQuota
}

export interface LeaveDetailResponse {
  success: true
  message: string
  data: Leave
}
