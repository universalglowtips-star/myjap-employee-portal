import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { LoginRequest, LoginResponseData, MeResponseData } from '../types/auth'

/** POST /login - route juga ada versi /v1/login (sama persis), pakai yang tanpa prefix v1 dulu, konsisten dengan seluruh testing kita selama ini. */
export async function login(payload: LoginRequest): Promise<LoginResponseData> {
  const res = await apiClient.post<ApiSuccessResponse<LoginResponseData>>('/login', payload)
  return res.data.data
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
