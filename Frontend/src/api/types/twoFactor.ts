import type { Employee } from './employee'

/**
 * Fitur 2FA (TOTP) - 2026-09-21. Verifikasi: TwoFactorController.php.
 */

/** RESPONSE data POST /two-factor/enable. qr_code SUDAH data URI base64 (data:image/svg+xml;base64,...) - langsung pasang ke <img src>, backend yang urus konversi dari SVG mentah (lihat catatan TwoFactorService::getQrCodeInline()). */
export interface TwoFactorEnableResponseData {
  secret: string
  qr_code: string
}

export interface TwoFactorConfirmRequest {
  code: string
}

/** RESPONSE data POST /two-factor/confirm - recovery_codes PLAINTEXT, cuma muncul SEKALI di response ini, gak pernah bisa diambil ulang setelahnya. access_token/employee sama bentuknya kayak LoginResponseData - dipakai buat authStore.completeLogin() yang sama. */
export interface TwoFactorConfirmResponseData {
  recovery_codes: string[]
  access_token: string
  token_type: 'Bearer'
  employee: Employee
}

/** REQUEST POST /login/verify-2fa - persis SATU dari `code` ATAU `recovery_code` diisi, gak pernah dua-duanya. */
export interface VerifyTwoFactorRequest {
  challenge_token: string
  code?: string
  recovery_code?: string
}
