import type { SalaryComponentCategory } from './salaryComponent'

/**
 * Task 16 - "Atur Tarif per Cabang". Verifikasi:
 * app/Http/Controllers/Api/OfficeLocationSalaryRateController.php::index().
 *
 * `components` cuma berisi komponen fixed/scheduled_variable yang
 * APPLICABLE buat MINIMAL 1 karyawan di cabang ini - kolom yang gak
 * relevan buat siapapun di cabang ini disembunyikan total, bukan
 * ditampilkan penuh "—" (pola sama persis "Isi Data Periode",
 * PayrollPeriodQuantitiesSection.tsx). BASIC (Gaji Pokok) SENGAJA TIDAK
 * ada di `components` - itu field `basic_salary` terpisah di tiap
 * employee, langsung dari employees.basic_salary (komponen kode BASIC
 * gak pernah lewat employee_salary_components/position_salary_components,
 * lihat PayslipController::resolveComponentRate()).
 */
export interface OfficeLocationSalaryRateComponent {
  id: number
  code: string
  name: string
  category: SalaryComponentCategory
}

/**
 * rates dikunci per salary_component_id (number, TAPI jadi STRING key di
 * objek JS/JSON - akses tetap pakai `rates[String(component.id)]` atau
 * `rates[component.id]` yang otomatis di-coerce JS, dua-duanya jalan).
 *
 * - applicable === false -> TIDAK berlaku buat karyawan ini sama sekali
 *   (jabatannya belum diatur DAN gak ada override individual) - tampil
 *   "—", BUKAN input kosong.
 * - applicable === true, amount !== null -> tarif yang berlaku SEKARANG
 *   (override kalau is_override true, kalau enggak berarti dari default
 *   jabatan).
 */
export interface OfficeLocationSalaryRateCell {
  amount: string | null
  is_override: boolean
  applicable: boolean
}

export interface OfficeLocationSalaryRateEmployee {
  id: number
  employee_code: string
  full_name: string
  position_id: number
  position_name: string | null
  /** Gaji Pokok - employees.basic_salary LANGSUNG, bukan bagian `rates` (lihat catatan interface di atas). Selalu ada, gak pernah "—". */
  basic_salary: string
  rates: Record<number, OfficeLocationSalaryRateCell>
}

export interface OfficeLocationSalaryRateListResponse {
  success: true
  message: string
  data: {
    office_location: {
      id: number
      office_code: string
      office_name: string
    }
    components: OfficeLocationSalaryRateComponent[]
    employees: OfficeLocationSalaryRateEmployee[]
  }
}

/**
 * PUT office-locations/{id}/salary-rates - verifikasi ::update(). Batch
 * SEKALIGUS, 1 transaction (pola sama persis PayrollPeriodQuantityUpdateRequest).
 *
 * `rates[].amount` NULLABLE - null berarti CABUT override (karyawan
 * balik ikut default jabatan, atau jadi tidak-applicable kalau jabatan
 * juga belum diatur), BUKAN diset ke Rp 0. `basic_salaries[].amount`
 * WAJIB angka - Gaji Pokok gak punya tabel default buat fallback.
 */
export interface OfficeLocationSalaryRateUpdateRequest {
  rates?: Array<{
    employee_id: number
    salary_component_id: number
    amount: number | null
  }>
  basic_salaries?: Array<{
    employee_id: number
    amount: number
  }>
}
