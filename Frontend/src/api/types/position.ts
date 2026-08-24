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
 * `allowance` STRING (bukan number) - kolom decimal(15,2) TANPA $casts
 * eksplisit di model, PDO/Eloquent balikin decimal sebagai string kalau
 * gak di-cast - pola sama kayak Employee.basic_salary.
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
  allowance: string
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
 * dikirim). `allowance` juga wajib (required|numeric|min:0).
 */
export interface PositionCreateRequest {
  department_id: number
  position_code: string
  position_name: string
  allowance: number
  description?: string | null
  is_active: boolean
}

export type PositionUpdateRequest = PositionCreateRequest
