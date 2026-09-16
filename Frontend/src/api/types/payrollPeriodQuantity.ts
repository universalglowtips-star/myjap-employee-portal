import type { Employee } from './employee'
import type { SalaryComponent } from './salaryComponent'

/**
 * Task 15b - "Jumlah" (Hari Kerja/Jumlah Resi dst) per periode per
 * karyawan per komponen scheduled_variable, diisi manual HRD SEBELUM
 * generate lewat "Isi Data Periode". Verifikasi:
 * database/migrations/2026_09_15_182225_create_payroll_period_employee_quantities_table.php
 * + app/Models/PayrollPeriodEmployeeQuantity.php (quantity decimal:2 ->
 * STRING) + PayrollPeriodQuantityController.php (index/update ->with(['employee','salaryComponent'])
 * - relasi salaryComponent() camelCase di-serialize snake_case jadi
 * `salary_component` di JSON, pola sama employeeOfficeScope.ts).
 *
 * quantity per KOMPONEN (bukan 1 angka global per karyawan per
 * periode) - 1 karyawan bisa punya beberapa baris di periode yang
 * sama kalau punya beberapa komponen scheduled_variable sekaligus
 * (mis. Hari Kerja utk Uang Harian DAN Jumlah Resi utk Bonus DLV).
 */
export interface PayrollPeriodEmployeeQuantity {
  id: number
  payroll_period_id: number
  employee_id: number
  salary_component_id: number
  quantity: string
  created_at: string
  updated_at: string
  employee?: Employee
  salary_component?: SalaryComponent
}

/** GET payroll-periods/{id}/quantities - verifikasi PayrollPeriodQuantityController::index(). */
export interface PayrollPeriodQuantityListResponse {
  success: true
  message: string
  data: PayrollPeriodEmployeeQuantity[]
}

/**
 * PUT payroll-periods/{id}/quantities - verifikasi ::update(). Batch
 * upsert SEKALIGUS (BUKAN per-baris kayak PositionSalaryComponent/
 * EmployeeSalaryComponent) - HRD ngisi 1 tabel besar lalu simpan 1x.
 * Cuma bisa selagi PayrollPeriod.status === 'Draft' (422 kalau enggak).
 */
export interface PayrollPeriodQuantityUpdateRequest {
  quantities: Array<{
    employee_id: number
    salary_component_id: number
    quantity: number
  }>
}
