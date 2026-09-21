import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type {
  TwoFactorConfirmResponseData,
  TwoFactorEnableResponseData,
  VerifyTwoFactorRequest,
} from '../types/twoFactor'
import type { LoginResponseData } from '../types/auth'

/**
 * POST /two-factor/enable - `overrideToken` OPSIONAL. Dua jalur pemakaian:
 * - Paksa setup (belum pernah login penuh) -> WAJIB isi overrideToken
 *   (setup_token dari LoginResult.status==='requires_2fa_setup') -
 *   authStore.token masih null di titik ini, interceptor apiClient
 *   gak punya apapun buat di-attach otomatis.
 * - Sukarela (halaman Keamanan Akun, user sudah login normal) -
 *   overrideToken DIKOSONGKAN, interceptor otomatis pakai token normal
 *   dari authStore/localStorage seperti endpoint lain.
 */
export async function enableTwoFactor(overrideToken?: string): Promise<TwoFactorEnableResponseData> {
  const res = await apiClient.post<ApiSuccessResponse<TwoFactorEnableResponseData>>(
    '/two-factor/enable',
    undefined,
    overrideToken ? { headers: { Authorization: `Bearer ${overrideToken}` } } : undefined
  )
  return res.data.data
}

/** POST /two-factor/confirm - `overrideToken` opsional, alasan sama persis enableTwoFactor(). */
export async function confirmTwoFactor(code: string, overrideToken?: string): Promise<TwoFactorConfirmResponseData> {
  const res = await apiClient.post<ApiSuccessResponse<TwoFactorConfirmResponseData>>(
    '/two-factor/confirm',
    { code },
    overrideToken ? { headers: { Authorization: `Bearer ${overrideToken}` } } : undefined
  )
  return res.data.data
}

/**
 * POST /login/verify-2fa - route PUBLIC (challenge_token dikirim di
 * body, BUKAN header Authorization) - interceptor apiClient tetap
 * nyoba nempelin token dari localStorage kalau ada, tapi backend gak
 * peduli sama sekali (route ini gak lewat auth:sanctum), jadi aman
 * dipanggil kapan pun termasuk saat authStore.token masih null.
 */
export async function verifyTwoFactor(payload: VerifyTwoFactorRequest): Promise<LoginResponseData> {
  const res = await apiClient.post<ApiSuccessResponse<LoginResponseData>>('/login/verify-2fa', payload)
  return res.data.data
}
