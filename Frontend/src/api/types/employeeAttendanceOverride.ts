import type { OfficeLocation } from './officeLocation'
import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/EmployeeAttendanceLocationOverride.php ($fillable)
 * + migration split_scope_type_by_direction_on_attendance_overrides +
 * add_direction_to_attendance_override_offices + EmployeeAttendanceLocationOverrideController.php
 * (Task per-arah - scope_type dipecah jadi 2 kolom check_in/check_out,
 * masing-masing bisa punya daftar cabang SPECIFIC_BRANCHES SENDIRI).
 *
 * 1 employee = MAKSIMAL 1 row override (UNIQUE constraint di employee_id,
 * TIDAK berubah dari sebelumnya) - bukan riwayat/banyak override per
 * karyawan, cuma scope_type-nya sekarang punya 2 sisi (arah). ANYWHERE
 * (value enum baru) - employee dikecualikan TOTAL dari validasi
 * office-membership DAN radius GPS buat arah itu (backend
 * AttendanceLocationPolicyService::isUnrestricted()) - office_location_id
 * TETAP wajib dipilih/dikirim (FK NOT NULL di attendances), GPS/foto
 * TETAP wajib direkam, ANYWHERE cuma mematikan BLOCKING-nya.
 *
 * `offices_check_in`/`offices_check_out` cuma keisi kalau scope_type
 * arah itu = SPECIFIC_BRANCHES (scope lain di-sync([]) buat arah itu
 * oleh controller). Tanggal berlaku + reason TETAP 1 set dipakai
 * bersama buat KEDUA arah (bukan diduplikasi). TIDAK ADA approval flow.
 */
export type OverrideScopeType = 'HOME_ONLY' | 'ALL_BRANCHES' | 'SPECIFIC_BRANCHES' | 'SUPERVISED_BRANCHES' | 'ANYWHERE'

export interface EmployeeAttendanceLocationOverride {
  id: number
  employee_id: number
  scope_type_check_in: OverrideScopeType
  scope_type_check_out: OverrideScopeType
  effective_start_date: string | null
  effective_end_date: string | null
  reason: string | null
  created_by: number
  created_at: string
  updated_at: string
  offices_check_in?: OfficeLocation[]
  offices_check_out?: OfficeLocation[]
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
 * controller::update() validate(). office_location_ids_check_in/out
 * WAJIB (array, required_if scope_type_check_in/out=SPECIFIC_BRANCHES) -
 * opsional buat scope lain. reason WAJIB diisi (required|string|max:1000)
 * meski kolom DB nullable. effective_start_date/end_date + reason TETAP
 * 1 set berlaku buat KEDUA arah.
 */
export interface EmployeeAttendanceLocationOverrideUpdateRequest {
  scope_type_check_in: OverrideScopeType
  office_location_ids_check_in?: number[]
  scope_type_check_out: OverrideScopeType
  office_location_ids_check_out?: number[]
  effective_start_date?: string | null
  effective_end_date?: string | null
  reason: string
}
