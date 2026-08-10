import { useAuthStore } from '../stores/authStore'
import { evaluatePermission } from '../permissions/evaluatePermission'

/**
 * Wrapper baca langsung dari authStore - dipakai di komponen/
 * PermissionGate (Langkah 4). Logic inti murni ada di
 * permissions/evaluatePermission.ts (testable terpisah).
 *
 * KOREKSI dari versi file ini sebelumnya: comment lama bilang
 * "backend sudah flatten semua permission_code untuk SUPER_ADMIN" -
 * ini ASUMSI YANG GAK PERNAH DIVERIFIKASI (sempat mau dicek via
 * GET /me pakai token SUPER_ADMIN tapi gak pernah kelar ditest).
 * Sesuai aturan B yang eksplisit: SUPER_ADMIN HARUS di-bypass manual
 * lewat cek role_code, TIDAK mengandalkan isi array permissions -
 * pola yang sama dengan bug nyata yang pernah ketemu di backend
 * (pendingMyApproval() yang awalnya "kebetulan" benar buat
 * SUPER_ADMIN, bukan sengaja, lalu diperbaiki jadi eksplisit).
 */
export function hasPermission(code: string | string[]): boolean {
  const { permissions, employee } = useAuthStore.getState()
  const isSuperAdmin = employee?.role?.role_code === 'SUPER_ADMIN'
  return evaluatePermission(permissions, isSuperAdmin, code)
}

/**
 * Versi REAKTIF - dipakai DI DALAM komponen (termasuk PermissionGate)
 * supaya re-render otomatis kalau `permissions`/`employee` di store
 * berubah (mis. tepat setelah login selesai, permissions baru
 * kepopulate). hasPermission() di atas cuma snapshot sekali baca
 * (getState()) - AMAN dipakai di event handler/kode di luar render,
 * TAPI TIDAK akan bikin komponen re-render kalau dipanggil langsung
 * di body render. Jangan tuker pemakaian keduanya.
 */
export function usePermission(code: string | string[]): boolean {
  return useAuthStore((s) => {
    const isSuperAdmin = s.employee?.role?.role_code === 'SUPER_ADMIN'
    return evaluatePermission(s.permissions, isSuperAdmin, code)
  })
}
