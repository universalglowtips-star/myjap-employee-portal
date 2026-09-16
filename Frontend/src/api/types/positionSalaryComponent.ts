import type { Position } from './position'
import type { SalaryComponent } from './salaryComponent'

/**
 * Task 15b - default nominal (category fixed) ATAU tarif (category
 * scheduled_variable) per Jabatan, per Komponen Gaji. Verifikasi:
 * database/migrations/2026_09_15_182223_create_position_salary_components_table.php
 * + app/Models/PositionSalaryComponent.php (amount di-cast decimal:2 ->
 * balik STRING, pola sama SalaryComponent.default_amount) +
 * SalaryComponentPositionController.php.
 *
 * Keberadaan baris = komponen ini BERLAKU untuk jabatan ini. Absennya
 * baris = jabatan itu gak dapat komponen tersebut sama sekali, BUKAN
 * dapat dengan nominal 0 (lihat resolveComponentRate() di backend).
 */
export interface PositionSalaryComponent {
  id: number
  position_id: number
  salary_component_id: number
  amount: string
  created_at: string
  updated_at: string
  position?: Position
  salary_component?: SalaryComponent
}

/** GET salary-components/{id}/positions - verifikasi SalaryComponentPositionController::index(). */
export interface PositionSalaryComponentListResponse {
  success: true
  message: string
  data: PositionSalaryComponent[]
}

/**
 * POST salary-components/{id}/positions - verifikasi ::store(). Upsert
 * (BEDA dari EmployeeOfficeScope::store() yang menolak duplikat) -
 * submit ulang buat jabatan yang sudah ada di-treat sebagai UPDATE
 * nominalnya, bukan error 409.
 */
export interface PositionSalaryComponentCreateRequest {
  position_id: number
  amount: number
}
