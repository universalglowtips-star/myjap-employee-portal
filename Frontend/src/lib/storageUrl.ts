import { API_BASE_URL } from '../api/client'

/**
 * Field `photo` di database nyimpen PATH RELATIF (mis. "employees/abc.png"),
 * BUKAN URL penuh - dikonfirmasi dari investigasi Modul Karyawan (backend
 * Storage::disk('public')->store(...), url publiknya {APP_URL}/storage/...).
 * API_BASE_URL selalu diakhiri "/api" (mis. "http://127.0.0.1:8000/api"),
 * dipotong dulu biar dapet base APP_URL asli sebelum nempelin "/storage/".
 */
export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const appUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${appUrl}/storage/${path}`
}
