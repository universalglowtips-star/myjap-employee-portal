import type { OfficeLocation } from './officeLocation'
import type { Employee } from './employee'

/**
 * Verifikasi: app/Models/EmployeeOfficeScope.php ($fillable) +
 * database/migrations/2026_08_04_090000_create_employee_office_scopes_table.php
 * + EmployeeOfficeScopeController.php (Task 8e, investigasi sesi
 * terpisah sebelumnya) + curl langsung ke endpoint asli (bukan diasumsikan
 * dari kode doang - lihat catatan `granted_by` di bawah).
 *
 * 1 employee BISA punya banyak baris scope (UNIQUE-nya di pasangan
 * employee_id+office_location_id, relasi Employee::officeScopes() HasMany)
 * - beda dari EmployeeAttendanceLocationOverride (Task 8d) yang cuma 1
 * row per employee. TIDAK ADA dimensi tanggal, TIDAK ADA field
 * reason/catatan, TIDAK ADA approval flow - murni grant/revoke instan.
 *
 * TEMUAN PENTING soal `granted_by` (dikonfirmasi via curl asli, BUKAN
 * cuma baca kode): kolom `granted_by` (raw FK integer) dan relasi
 * `grantedBy()` SAMA-SAMA snake-case jadi key JSON `granted_by` -
 * begitu relasinya di-load (SELALU di-load di index()/store() -
 * controller pakai ->with()/->load() eksplisit), Laravel nimpa raw
 * attribute dengan OBJECT Employee hasil relasi di key yang sama.
 * Jadi `granted_by` di response API SELALU null ATAU objek Employee
 * penuh - TIDAK PERNAH muncul sebagai angka mentah di 2 endpoint ini.
 */
export interface EmployeeOfficeScope {
  id: number
  employee_id: number
  office_location_id: number
  granted_by: Employee | null
  created_at: string
  updated_at: string
  office_location?: OfficeLocation
}

/** GET employees/{id}/office-scopes - verifikasi EmployeeOfficeScopeController::index(). */
export interface EmployeeOfficeScopeListResponse {
  success: true
  message: string
  data: EmployeeOfficeScope[]
}

/**
 * POST employees/{id}/office-scopes - verifikasi ::store(). Body cuma
 * 1 field (office_location_id), 1 request = 1 cabang (BUKAN array).
 * Balikin 409 kalau cabang itu sudah jadi wewenangnya (dicek manual di
 * controller, bukan DB unique-constraint exception) - message-nya
 * SUDAH jelas & spesifik dari backend ("Karyawan ini sudah punya
 * wewenang di cabang tersebut."), gak perlu di-override jadi pesan lain.
 */
export interface EmployeeOfficeScopeCreateRequest {
  office_location_id: number
}
