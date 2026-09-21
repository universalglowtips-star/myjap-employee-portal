import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { LoginApiResponse, LoginRequest, LoginResult, MeResponseData } from '../types/auth'

/**
 * POST /login - route juga ada versi /v1/login (sama persis), pakai
 * yang tanpa prefix v1 dulu, konsisten dengan seluruh testing kita
 * selama ini.
 *
 * Fitur 2FA (2026-09-21) - response backend sekarang 3 varian
 * (LoginApiResponse), dipetakan ke LoginResult di sini biar caller
 * (authStore) gak perlu tau bentuk raw-nya. Urutan cek WAJIB
 * requires_2fa_setup/requires_2fa_code DULU sebelum data - dua field
 * pertama itu gak pernah bareng field `data`.
 */
export async function login(payload: LoginRequest): Promise<LoginResult> {
  const res = await apiClient.post<LoginApiResponse>('/login', payload)
  const body = res.data

  if (body.requires_2fa_setup && body.setup_token) {
    return { status: 'requires_2fa_setup', setupToken: body.setup_token }
  }

  if (body.requires_2fa_code && body.challenge_token) {
    return { status: 'requires_2fa_code', challengeToken: body.challenge_token }
  }

  return { status: 'success', accessToken: body.data!.access_token, employee: body.data!.employee }
}

/** POST /logout - butuh Bearer token (route di dalam grup auth:sanctum). */
export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}

/** GET /me - butuh Bearer token. Sumber permissions + office_scopes untuk authStore. */
export async function fetchMe(): Promise<MeResponseData> {
  const res = await apiClient.get<ApiSuccessResponse<MeResponseData>>('/me')
  return res.data.data
}
