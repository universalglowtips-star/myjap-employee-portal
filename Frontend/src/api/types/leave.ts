import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/Leave.php + migration
 * 2026_07_22_134153_create_leaves_table.php + LeaveController (dibaca
 * ulang sesi investigasi Task 9.5).
 */
export interface Leave {
  id: number
  employee_id: number
  leave_type: 'Annual Leave' | 'Sick' | 'Permission' | 'Maternity Leave' | 'Unpaid Leave' | 'Business Trip'
  start_date: string
  end_date: string
  total_days: number
  reason: string
  attachment: string | null
  status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: number | null
  approved_at: string | null
  approval_notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  employee?: Employee
  approver?: Employee
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
