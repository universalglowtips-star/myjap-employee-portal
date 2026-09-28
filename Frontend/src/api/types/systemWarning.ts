import type { Employee } from './employee'

/**
 * Verifikasi: database/migrations (SHOW CREATE TABLE system_warnings) +
 * app/Models/SystemWarning.php (fillable, casts, relasi) +
 * SystemWarningController.php (index/resolve) - Fase 1 investigasi
 * (2026-09-28), bukan tebakan dari nama kolom.
 *
 * `related` polymorphic (morphTo, related_type/related_id) - shape
 * isinya beda-beda tergantung entitas yang dirujuk (sekarang cuma
 * pernah PayrollPeriod, tapi kolomnya genuinely bisa nunjuk model lain
 * di masa depan tanpa migration) - sama alasannya kayak
 * AuditLog.old_values/new_values, makanya Record<string, unknown>.
 * BISA null (baris tanpa entitas terkait, atau type baru yang gak
 * dikirim related apapun) - jangan asumsi selalu ada, lihat
 * lib/systemWarningRelatedMeta.ts buat cara aman baca field di dalamnya.
 */
export interface SystemWarning {
  id: number
  type: string
  related_type: string | null
  related_id: number | null
  related: Record<string, unknown> | null
  message: string
  is_resolved: boolean
  resolved_by: number | null
  resolved_at: string | null
  resolver: Employee | null
  created_at: string
  updated_at: string
}

/** Query params GET /system-warnings - persis SystemWarningController::index(). `include_resolved` default false di backend kalau gak dikirim sama sekali. */
export interface SystemWarningQueryParams {
  type?: string
  include_resolved?: boolean
  per_page?: number
  page?: number
}

/** Bentuk response SAMA PERSIS AuditLog/Payslip dkk - pagination di LUAR data, bukan ApiSuccessResponse<T> generic. */
export interface SystemWarningListResponse {
  success: true
  message: string
  total: number
  data: SystemWarning[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

/** Response POST /system-warnings/{id}/resolve. */
export interface SystemWarningResolveResponse {
  success: true
  message: string
  data: SystemWarning
}
