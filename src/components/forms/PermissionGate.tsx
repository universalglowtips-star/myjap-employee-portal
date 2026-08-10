import type { ReactNode } from 'react'
import { usePermission } from '../../lib/permissions'

interface PermissionGateProps {
  /** Permission code (persis dari backend, mis. 'payslip.view') atau array - lolos kalau salah satu cocok. */
  code: string | string[]
  children: ReactNode
  /**
   * Default `null` (elemen HILANG TOTAL, bukan disabled/abu-abu).
   * Sesuai keputusan di Implementation Contract: kalau di-disable,
   * user masih tau elemennya ADA (bocor informasi "fitur ini exist
   * tapi kamu gak boleh") - disembunyikan total lebih aman & lebih
   * konsisten dengan cara backend menyembunyikan (403), bukan
   * "menyediakan info yang gak relevan buat user itu".
   */
  fallback?: ReactNode
}

/**
 * SUPER_ADMIN bypass (role_code eksplisit) dan office_scopes TIDAK
 * pernah masuk logic ini - persis sesuai kontrak yang sudah dikunci:
 * office_scopes bukan permission, cuma dipakai di logic approval
 * workflow yang memang butuh scope (nanti, Fase E).
 */
export function PermissionGate({ code, children, fallback = null }: PermissionGateProps) {
  const allowed = usePermission(code)
  return allowed ? <>{children}</> : <>{fallback}</>
}
