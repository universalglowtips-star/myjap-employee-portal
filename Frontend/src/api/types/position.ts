import type { Department } from './department'

/**
 * Verifikasi: database/migrations/2026_07_15_183059_create_positions_table.php
 * + 2026_07_31_100000_add_soft_deletes_to_master_data_tables.php
 * (deleted_at DITAMBAH BELAKANGAN via migration terpisah, bukan dari
 * migration awal - Position tetap punya SoftDeletes trait yang valid)
 * + app/Models/Position.php ($fillable, SoftDeletes) + PositionController.php
 * (index/store/update/show SEMUA eager-load department -
 * ->with('department')/->load('department')).
 *
 * `allowance` SENGAJA gak ada di sini (dihapus dari UI+type 2026-09-28,
 * Kelompok A) - dead field sejak Task 15b, digantikan komponen gaji
 * per-Jabatan/Karyawan (position_salary_components/
 * employee_salary_components). Kolom DB positions.allowance TETAP ADA
 * (backend freeze, no migration) dan API masih balikin nilainya mentah -
 * TS interface ini sengaja lebih sempit dari response asli (properti
 * ekstra yang gak dideklarasikan aman di TS structural typing), karena
 * gak ada satupun kode yang perlu membacanya lagi.
 *
 * `department` OPSIONAL - meskipun PositionController SELALU eager-load
 * di endpoint /positions, Position type ini juga dipakai di
 * Employee.position (GET /me) yang belum tentu nge-load department di
 * dalamnya - ditandai optional biar gak nyasar asumsi ke konteks lain.
 */
export interface Position {
  id: number
  department_id: number
  position_code: string
  position_name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  department?: Department
}

/**
 * REQUEST create/update - verifikasi PositionController::store()/update()
 * validate(). BEDA dari Department: `is_active` WAJIB (required|boolean),
 * BUKAN optional - backend Posisi gak punya default is_active kayak
 * Department (yang optional, default true di controller kalau gak
 * dikirim). `allowance` TIDAK dikirim lagi (dihapus dari form 2026-09-28) -
 * backend validation-nya sudah diloncong ke nullable, kolom DB-nya
 * pakai default 0.00 kalau gak dikirim sama sekali.
 */
export interface PositionCreateRequest {
  department_id: number
  position_code: string
  position_name: string
  description?: string | null
  is_active: boolean
}

export type PositionUpdateRequest = PositionCreateRequest
