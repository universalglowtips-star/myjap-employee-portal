import type { Employee } from './employee'

/** REQUEST - dikirim ke POST /login. Verifikasi: $request->validate() di AuthController::login() */
export interface LoginRequest {
  email: string
  password: string
}

/** RESPONSE - data di dalam field 'data' dari POST /login (varian sukses langsung) ATAU dari POST /two-factor/confirm/POST /login/verify-2fa. employee di sini TIDAK ada relasi role (lihat catatan di employee.ts). */
export interface LoginResponseData {
  access_token: string
  token_type: 'Bearer'
  employee: Employee
}

/**
 * Fitur 2FA (2026-09-21) - bentuk RAW response POST /login, 3 varian
 * tergantung role+status 2FA employee. Verifikasi: AuthController::login().
 * Field yang ADA tergantung varian mana yang balik - request cuma dapat
 * SATU dari: `data`, ATAU `requires_2fa_setup`+`setup_token`, ATAU
 * `requires_2fa_code`+`challenge_token`. Dipetakan ke LoginResult yang
 * lebih rapi di endpoints/auth.ts - authStore/LoginPage TIDAK PERNAH
 * baca bentuk raw ini langsung.
 */
export interface LoginApiResponse {
  success: true
  message: string
  data?: LoginResponseData
  requires_2fa_setup?: true
  setup_token?: string
  requires_2fa_code?: true
  challenge_token?: string
}

/** Hasil login yang SUDAH dinormalisasi (dipetakan dari LoginApiResponse di endpoints/auth.ts). */
export type LoginResult =
  | { status: 'success'; accessToken: string; employee: Employee }
  | { status: 'requires_2fa_setup'; setupToken: string }
  | { status: 'requires_2fa_code'; challengeToken: string }

/**
 * RESPONSE - data di dalam field 'data' dari GET /me.
 * Verifikasi: routes/api.php baris 63-83 (closure, bukan controller
 * method terpisah - ini endpoint kecil yang ditambal khusus buat
 * kebutuhan frontend, patch 0034).
 *
 * - employee.role SELALU ada di sini (endpoint ini ->load('role')
 *   eksplisit) - KECUALI employee.role_id memang null, baru
 *   employee.role jadi undefined juga (gak ada yang bisa di-load).
 * - permissions: hasil pluck('permission_code') - array string flat,
 *   BUKAN array object {code, name}. Kalau role_id null, balik array
 *   kosong (collect() kosong di backend), BUKAN null/undefined.
 * - office_scopes: hasil pluck('office_location_id') - array number
 *   flat. WEWENANG cabang (employee_office_scopes), BUKAN sama
 *   dengan employee.office_location_id (itu kantor asal, beda konsep
 *   - sudah dikonfirmasi berkali-kali sepanjang project ini).
 */
export interface MeResponseData {
  employee: Employee
  permissions: string[]
  office_scopes: number[]
}
