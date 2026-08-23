import type { Role } from './role'
import type { Position } from './position'

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
}
