import type { SalaryComponent } from './salaryComponent'

/**
 * Task 15b - override nominal/tarif per Karyawan, per Komponen Gaji
 * (misal karena senioritas, walau jabatan sama). Verifikasi:
 * database/migrations/2026_09_15_182224_create_employee_salary_components_table.php
 * + app/Models/EmployeeSalaryComponent.php (amount decimal:2 -> STRING) +
 * EmployeeSalaryComponentController.php.
 *
 * Resolusi saat generate: ADA baris di sini -> pakai ini (menang atas
 * default jabatan); TIDAK ADA -> fallback ke PositionSalaryComponent
 * lewat employee.position_id; TIDAK ADA juga -> komponen itu TIDAK
 * berlaku buat karyawan ini sama sekali (bukan default ke 0).
 *
 * TIDAK ADA kolom alasan/catatan - keputusan eksplisit Bagus, override
 * murni angka yang HRD input manual.
 */
export interface EmployeeSalaryComponent {
  id: number
  employee_id: number
  salary_component_id: number
  amount: string
  created_at: string
  updated_at: string
  salary_component?: SalaryComponent
}

/** GET employees/{id}/salary-components - verifikasi EmployeeSalaryComponentController::index(). */
export interface EmployeeSalaryComponentListResponse {
  success: true
  message: string
  data: EmployeeSalaryComponent[]
}

/** POST employees/{id}/salary-components - verifikasi ::store(). Upsert, sama pola PositionSalaryComponentCreateRequest. */
export interface EmployeeSalaryComponentCreateRequest {
  salary_component_id: number
  amount: number
}
