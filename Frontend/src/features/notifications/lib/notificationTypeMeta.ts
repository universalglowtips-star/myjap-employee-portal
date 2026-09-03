import { Ban, Bell, CheckCircle2, Clock, FileCheck, FileWarning, RotateCcw, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NotificationTypeMeta {
  icon: LucideIcon
  colorClass: string
}

/**
 * 9 `type` yang BENERAN ada di backend sekarang (dikonfirmasi
 * investigasi terpisah sebelumnya - grep `Notification::notify(` di
 * seluruh app/), dikelompokkan by sentiment sesuai instruksi tugas:
 *
 * - Positif/Selesai -> text-status-approved. BUKAN text-success -
 *   token itu STALE (nilai ASLI --color-status-approved SEBELUM
 *   digelapin karena gagal WCAG AA sebagai teks, lihat comment
 *   index.css baris ~40 - dipakai sebagai stroke chart Task 7,
 *   sengaja TIDAK dipakai sebagai teks di mana pun).
 * - Negatif/Ditolak -> text-status-rejected.
 * - Netral/Perlu-perhatian -> text-status-pending (amber). Dipilih
 *   BUKAN abu-abu polos - ke-4 type ini (leave_cancelled,
 *   payslip_unpublished, payroll_period_reverted,
 *   payroll_pending_approval) semuanya butuh tindak lanjut/perhatian
 *   user, bukan cuma info pasif - pola sama persis "Cuti Pending" &
 *   "Peringatan Sistem" di Dashboard (Task 7) yang juga pakai
 *   status-pending buat makna "perlu perhatian".
 */
const NOTIFICATION_TYPE_META: Record<string, NotificationTypeMeta> = {
  leave_approved: { icon: CheckCircle2, colorClass: 'text-status-approved' },
  payslip_published: { icon: FileCheck, colorClass: 'text-status-approved' },
  payroll_fully_approved: { icon: CheckCircle2, colorClass: 'text-status-approved' },

  leave_rejected: { icon: XCircle, colorClass: 'text-status-rejected' },
  payroll_rejected: { icon: XCircle, colorClass: 'text-status-rejected' },

  leave_cancelled: { icon: Ban, colorClass: 'text-status-pending' },
  payslip_unpublished: { icon: FileWarning, colorClass: 'text-status-pending' },
  payroll_period_reverted: { icon: RotateCcw, colorClass: 'text-status-pending' },
  payroll_pending_approval: { icon: Clock, colorClass: 'text-status-pending' },
}

/**
 * Fallback DEFENSIVE WAJIB - `type` di DB string bebas (bukan enum),
 * bisa muncul type baru kapan saja dari backend tanpa migration/rilis
 * FE baru. Icon generik + neutral-600 (bukan neutral-400 - aturan
 * kontras standing rule), title/message TETAP tampil apa adanya -
 * BUKAN error/blank.
 */
const DEFAULT_TYPE_META: NotificationTypeMeta = { icon: Bell, colorClass: 'text-neutral-600' }

export function getNotificationTypeMeta(type: string): NotificationTypeMeta {
  return NOTIFICATION_TYPE_META[type] ?? DEFAULT_TYPE_META
}
