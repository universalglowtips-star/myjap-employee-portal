/**
 * Verifikasi: database/migrations/2026_07_16_063000_create_office_locations_table.php
 * + app/Models/OfficeLocation.php (SoftDeletes) + OfficeLocationController.php.
 *
 * latitude/longitude STRING (bukan number) - kolom decimal(10,7) TANPA
 * $casts eksplisit, PDO/Eloquent balikin decimal sebagai string kalau
 * gak di-cast - pola sama persis Position.allowance.
 *
 * check_in_start/check_in_end/check_out_start/check_out_end: kolom `time`
 * tanpa $casts, balik sebagai string "HH:MM:SS" - pola sama WorkShift.
 *
 * description ADA di schema (nullable text) meski gak eksplisit disebut
 * di spek field form awal - tetap diekspos sebagai "Catatan" opsional
 * di Tab Info, konsisten sama Department/Position yang selalu expose
 * field description kalau ada (keputusan dikonfirmasi user).
 */
export interface OfficeLocation {
  id: number
  office_code: string
  office_name: string
  latitude: string
  longitude: string
  radius_meter: number
  check_in_start: string
  check_in_end: string
  check_out_start: string
  check_out_end: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * REQUEST create/update - verifikasi OfficeLocationController::store()/
 * update() validate(). is_active WAJIB (required|boolean) - pola sama
 * Position/WorkShift, bukan optional kayak Department. latitude/longitude
 * dikirim sebagai number (form yang convert dari string input) - backend
 * cuma validasi 'numeric' polos, terima keduanya, tapi request type di
 * sini pakai number biar konsisten sama Position.allowance (response
 * string, request number).
 */
export interface OfficeLocationCreateRequest {
  office_code: string
  office_name: string
  latitude: number
  longitude: number
  radius_meter: number
  check_in_start: string
  check_in_end: string
  check_out_start: string
  check_out_end: string
  description?: string | null
  is_active: boolean
}

export type OfficeLocationUpdateRequest = OfficeLocationCreateRequest
