import type { OfficeLocation } from './officeLocation'
import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/EmployeeAttendanceLocationOverride.php ($fillable
 * + casts()) + database/migrations/2026_07_30_100003_..._overrides_table.php
 * + EmployeeAttendanceLocationOverrideController.php (Task 8d, investigasi
 * sesi terpisah sebelumnya).
 *
 * 1 employee = MAKSIMAL 1 row override (UNIQUE constraint di employee_id
 * pada migration) - bukan riwayat/banyak override per karyawan.
 * `offices` cuma keisi kalau scope_type = SPECIFIC_BRANCHES (scope lain
 * di-sync([]) alias dikosongkan oleh controller). TIDAK ADA approval flow
 * (tidak ada kolom status/approved_by di manapun) - PUT langsung apply.
 */
export type OverrideScopeType = 'HOME_ONLY' | 'ALL_BRANCHES' | 'SPECIFIC_BRANCHES' | 'SUPERVISED_BRANCHES'

export interface EmployeeAttendanceLocationOverride {
  id: number
  employee_id: number
  scope_type: OverrideScopeType
  effective_start_date: string | null
  effective_end_date: string | null
  reason: string | null
  created_by: number
  created_at: string
  updated_at: string
  offices?: OfficeLocation[]
  creator?: Employee
}

/**
 * GET employees/{employee}/attendance-location-override - verifikasi
 * EmployeeAttendanceLocationOverrideController::show(). `override` null
 * kalau karyawan belum punya override sama sekali (has_override: false) -
 * BUKAN 404, endpoint selalu 200 baik ada maupun tidak ada override.
 */
export interface EmployeeAttendanceLocationOverrideShowData {
  employee: {
    id: number
    full_name: string
    employee_code: string
  }
  has_override: boolean
  override: EmployeeAttendanceLocationOverride | null
}

/**
 * PUT employees/{employee}/attendance-location-override - verifikasi
 * controller::update() validate(). office_location_ids WAJIB (array,
 * required_if scope_type=SPECIFIC_BRANCHES) - opsional buat scope lain.
 * reason WAJIB diisi (required|string|max:1000) meski kolom DB nullable.
 */
export interface EmployeeAttendanceLocationOverrideUpdateRequest {
  scope_type: OverrideScopeType
  office_location_ids?: number[]
  effective_start_date?: string | null
  effective_end_date?: string | null
  reason: string
}
