/**
 * DUA bentuk response error yang BEDA dari backend - ini bukan
 * asumsi, dikonfirmasi langsung dari kode:
 *
 * 1. ApiErrorResponse - dipakai di HAMPIR SEMUA controller kita
 *    sendiri (login gagal, 403 permission, dst) - selalu
 *    { success: false, message: string }
 *
 * 2. LaravelValidationError - dipakai untuk exception BAWAAN
 *    Laravel yang TIDAK kita reshape (bootstrap/app.php
 *    withExceptions() kosong, gak ada custom handler). Ini
 *    kejadian di endpoint manapun yang masih pakai
 *    $request->validate([...]) langsung (misal POST /login
 *    sendiri) - kalau validasi gagal, bentuknya BEDA:
 *    { message: string, errors: Record<string, string[]> }
 *    TIDAK ADA field 'success' sama sekali di bentuk ini.
 *
 * API client (client.ts) HARUS bisa bedain kedua bentuk ini di
 * response interceptor - jangan asumsikan semua error selalu
 * ada 'success: false'.
 */
export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  message: string
}

export interface LaravelValidationError {
  message: string
  errors: Record<string, string[]>
}

/** Response 401 default Sanctum kalau token gak ada/invalid - juga TIDAK ada field 'success'. */
export interface LaravelUnauthenticated {
  message: 'Unauthenticated.'
}
