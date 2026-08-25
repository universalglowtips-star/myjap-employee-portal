/**
 * Verifikasi: database/migrations/2026_07_23_120000_create_salary_components_table.php
 * + app/Models/SalaryComponent.php (SoftDeletes + $casts eksplisit) +
 * SalaryComponentController.php.
 *
 * TEMUAN PENTING (gak ada di spek awal, WAJIB - bukan opsional): field
 * `type` (enum earning/deduction) - backend validasi 'required' di
 * store(), form TIDAK BISA submit tanpa ini. `is_required` juga field
 * asli terpisah dari `is_taxable` (dua boolean beda makna sama sekali -
 * satu soal pajak, satu soal "wajib disertakan di tiap payslip") -
 * bukan typo/duplikat, keduanya di-track terpisah bahkan di audit log
 * (SalaryComponentController::store() eksplisit include is_required,
 * BUKAN is_taxable, di old/new_values-nya).
 *
 * default_amount STRING (bukan number) - kolom di-cast eksplisit
 * `decimal:2` di model, Laravel decimal cast SELALU balikin string
 * diformat 2 desimal ("300000.00") - pola sama Position.allowance
 * meski alasannya beda (di sana TANPA cast, di sini DENGAN cast -
 * hasil akhir sama-sama string).
 *
 * is_taxable/is_required/is_active semua di-cast eksplisit 'boolean' -
 * beda dari Department/Position/Role/WorkShift/OfficeLocation yang gak
 * punya $casts (makanya balik integer 1/0 mentah). Di sini beneran
 * balik JSON true/false asli. Truthy-check TETAP dipakai di form
 * (bukan String()) buat konsistensi kode sama modul lain, meski secara
 * teknis String() juga aman di sini - gak ada downside pakai pola yang sama.
 */
export interface SalaryComponent {
  id: number
  code: string
  name: string
  type: 'earning' | 'deduction'
  default_amount: string
  is_taxable: boolean
  is_required: boolean
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * REQUEST create/update - verifikasi SalaryComponentController validate().
 * `type` WAJIB. default_amount/is_taxable/is_required/is_active semua
 * TEKNIS opsional di backend ('nullable'/'boolean' polos tanpa 'required') -
 * tapi tetap dikirim eksplisit dari form (ada kontrol UI buat semuanya),
 * konsisten sama pola WorkShift/OfficeLocation yang selalu kirim
 * eksplisit walau backend punya default.
 */
export interface SalaryComponentCreateRequest {
  code: string
  name: string
  type: 'earning' | 'deduction'
  default_amount: number
  is_taxable: boolean
  is_required: boolean
  is_active: boolean
  description?: string | null
}

export type SalaryComponentUpdateRequest = SalaryComponentCreateRequest
