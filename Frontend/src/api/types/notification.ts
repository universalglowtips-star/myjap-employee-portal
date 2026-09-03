/**
 * Verifikasi: app/Models/Notification.php ($fillable + casts()) +
 * database/migrations/2026_07_29_100000_create_notifications_table.php
 * + NotificationController.php (Task 9, investigasi sesi terpisah
 * sebelumnya).
 *
 * `type` STRING BEBAS (bukan enum di level DB/backend) - 9 nilai yang
 * BENERAN dipakai saat ini (leave_approved/leave_rejected/
 * leave_cancelled/payslip_published/payslip_unpublished/
 * payroll_period_reverted/payroll_fully_approved/payroll_rejected/
 * payroll_pending_approval), TAPI bisa muncul type lain kapan saja
 * dari backend tanpa migration baru - UI WAJIB defensive terhadap
 * type yang gak dikenal (lihat lib/notificationTypeMeta.ts).
 *
 * `data` JSON payload (mis. {leave_id: N}) - BUKAN url siap pakai,
 * TIDAK dipakai buat navigasi apa pun di fitur ini (instruksi tugas
 * eksplisit: klik notifikasi cuma mark-as-read, gak boleh navigasi -
 * halaman tujuan belum dibangun).
 */
export interface Notification {
  id: number
  employee_id: number
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

/** GET /notifications - personal-scoped otomatis (backend filter employee_id dari user login), paginated beneran (pola sama persis fetchEmployeesPaginated/fetchAuditLogs). */
export interface NotificationListResponse {
  success: true
  message: string
  total: number
  data: Notification[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

export interface NotificationQueryParams {
  per_page?: number
  page?: number
}
