import axios, { AxiosError } from 'axios'
import type { ApiErrorResponse, LaravelValidationError, LaravelUnauthenticated } from './types/common'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

const AUTH_STORAGE_KEY = 'myjap-auth'

function readTokenFromStorage(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } }
    return parsed.state?.token ?? null
  } catch {
    return null
  }
}

apiClient.interceptors.request.use((config) => {
  const token = readTokenFromStorage()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface NormalizedApiError {
  status: number | undefined
  message: string
  fieldErrors?: Record<string, string[]>
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse | LaravelValidationError | LaravelUnauthenticated>) => {
    const status = error.response?.status
    const body = error.response?.data

    let normalized: NormalizedApiError

    if (body && 'errors' in body) {
      normalized = { status, message: body.message, fieldErrors: body.errors }
    } else if (body && 'message' in body) {
      normalized = { status, message: body.message }
    } else {
      normalized = { status, message: 'Tidak bisa terhubung ke server.' }
    }

    if (status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    return Promise.reject(normalized)
  }
)