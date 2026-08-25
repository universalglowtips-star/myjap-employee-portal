import type { Role } from './role'
import type { Position } from './position'
import type { Department } from './department'
import type { WorkShift } from './workShift'
import type { OfficeLocation } from './officeLocation'

/**
 * Verifikasi: app/Models/Employee.php ($fillable + casts()) +
 * database/migrations/*_create_employees_table.php +
 * *_add_role_to_employees_table.php +
 * *_add_office_location_id_to_employees_table.php
 *
 * Field yang PERLU diperhatikan (bukan asumsi React-friendly):
 * - `password` TIDAK PERNAH muncul di JSON ($hidden di model)
 * - `basic_salary` di-cast `decimal:2` oleh Laravel -> JSON-nya
 *   STRING ("7000000.00"), BUKAN number. Dikonfirmasi juga dari
 *   response nyata yang kita lihat berkali-kali selama testing.
 *   JANGAN diubah jadi number di layer type - konversi (kalau
 *   perlu dihitung) dilakukan di layer terpisah, bukan di sini.
 * - `role_id` NULLABLE (migration terpisah, tanpa default) -
 *   employee BISA belum di-assign role sama sekali.
 * - `office_location_id` WAJIB (NOT NULL, tanpa nullable() di
 *   migration) - setiap employee pasti punya kantor asal.
 * - `role` cuma ADA kalau relasi di-load eksplisit oleh endpoint
 *   (mis. GET /me pakai ->load('role')). Response POST /login
 *   TIDAK me-load relasi ini - employee.role akan `undefined`,
 *   BUKAN `null`. Beda arti: undefined = gak di-load endpoint ini,
 *   null = kalau nanti ada endpoint yang eksplisit load tapi
 *   employee memang belum punya role (role_id null).
 * - `work_shift`/`office_location` (SNAKE_CASE, bukan `workShift`/
 *   `officeLocation` seperti nama method relasi di model) - dicek
 *   LANGSUNG ke response API asli (curl GET /employees), bukan
 *   diasumsikan dari nama method Eloquent. Laravel otomatis
 *   snake_case-in nama relasi pas serialize ke JSON regardless
 *   nama string yang dikirim ke with(), jadi `department`/`position`/
 *   `role` kebetulan sama (udah snake_case dari asalnya), tapi
 *   `workShift`/`officeLocation` berubah jadi `work_shift`/
 *   `office_location`.
 */
export interface Employee {
  id: number
  employee_code: string
  department_id: number
  position_id: number
  work_shift_id: number
  office_location_id: number
  role_id: number | null
  full_name: string
  email: string
  phone: string | null
  birth_date: string | null
  gender: 'L' | 'P'
  address: string | null
  join_date: string
  basic_salary: string
  photo: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  role?: Role
  position?: Position
  department?: Department
  work_shift?: WorkShift
  office_location?: OfficeLocation
}

/**
 * GET /employees (index, paginated) - verifikasi EmployeeController::index().
 * Bentuk response SAMA PERSIS AuditLogListResponse (total+data+pagination
 * di luar `data`, bukan ApiSuccessResponse<T> generic biasa).
 */
export interface EmployeeListResponse {
  success: true
  message: string
  total: number
  data: Employee[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

/**
 * Query params GET /employees - TERKONFIRMASI cuma `per_page` yang
 * dibaca controller (dicek langsung ke kode, bukan diasumsikan).
 * TIDAK ADA filter department_id/position_id/is_active sama sekali -
 * kalau dikirim, bakal diabaikan diam-diam oleh backend. `page`
 * didukung implisit lewat Laravel paginate(), pola sama AuditLog.
 */
export interface EmployeeQueryParams {
  per_page?: number
  page?: number
}
