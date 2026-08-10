import axios, { AxiosError } from 'axios'
import type { ApiErrorResponse, LaravelValidationError, LaravelUnauthenticated } from './types/common'

/**
 * Base URL - HARUS di-set lewat environment variable, jangan
 * hardcode. Default ke backend dev yang selama ini kita pakai
 * testing (127.0.0.1:8000) kalau env belum di-set.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

/** Nempelin Bearer token ke tiap request - token disimpan authStore (dibangun Langkah 3), dibaca dari localStorage di sini biar api/client.ts gak depend ke stores/ (hindari circular import). */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('myjap_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Normalisasi 2 bentuk error response backend (lihat api/types/common.ts)
 * jadi 1 bentuk yang konsisten dipakai di seluruh frontend -
 * TIDAK mengubah data dari backend, cuma bikin field 'message'
 * selalu bisa diandalkan ada isinya di layer manapun yang nangkep error.
 */
export interface NormalizedApiError {
  status: number | undefined
  message: string
  /** Cuma ada kalau ini validation error Laravel (422 default, bukan custom). */
  fieldErrors?: Record<string, string[]>
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse | LaravelValidationError | LaravelUnauthenticated>) => {
    const status = error.response?.status
    const body = error.response?.data

    let normalized: NormalizedApiError

    if (body && 'errors' in body) {
      // Bentuk Laravel default validation (422) - field 'errors' cuma ada di sini
      normalized = { status, message: body.message, fieldErrors: body.errors }
    } else if (body && 'message' in body) {
      // Bentuk custom kita (success:false) ATAU Sanctum unauthenticated (401) -
      // dua-duanya kebetulan sama-sama punya 'message', cukup 1 cabang
      normalized = { status, message: body.message }
    } else {
      // Network error / timeout / response kosong total
      normalized = { status, message: 'Tidak bisa terhubung ke server.' }
    }

    if (status === 401) {
      // Token invalid/expired - bersihkan token, biar ProtectedRoute
      // (dibangun nanti) redirect ke /login. TIDAK redirect paksa di
      // sini - itu tanggung jawab routing layer, bukan API client.
      localStorage.removeItem('myjap_token')
    }

    return Promise.reject(normalized)
  }
)
