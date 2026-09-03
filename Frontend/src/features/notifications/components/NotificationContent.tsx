import { cn } from '../../../lib/cn'
import { formatRelativeTime } from '../../../lib/formatRelativeTime'
import { getNotificationTypeMeta } from '../lib/notificationTypeMeta'
import type { Notification } from '../../../api/types/notification'

interface NotificationContentProps {
  notification: Notification
}

/**
 * Reused PERSIS SAMA di dropdown Topbar dan halaman penuh /notifications
 * - satu sumber kebenaran visual notifikasi, gak ada 2 versi rendering
 * yang bisa beda-beda. Background bg-primary-50 (tint biru sangat
 * terang, aman buat teks apa pun di atasnya) + dot kecil = indikator
 * belum dibaca (kombinasi 2 opsi yang disebut instruksi tugas -
 * "background sedikit beda ATAU dot kecil" - bukan cuma salah satu).
 */
export function NotificationContent({ notification }: NotificationContentProps) {
  const meta = getNotificationTypeMeta(notification.type)
  const Icon = meta.icon

  return (
    <div className={cn('flex gap-3 rounded-sm p-2', !notification.is_read && 'bg-primary-50')}>
      <Icon size={18} strokeWidth={2} className={cn('mt-0.5 shrink-0', meta.colorClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {!notification.is_read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
          )}
          <p className="font-body text-sm font-semibold text-neutral-900">{notification.title}</p>
        </div>
        <p className="mt-0.5 font-body text-sm text-neutral-600">{notification.message}</p>
        <p className="mt-1 font-body text-xs text-neutral-600">{formatRelativeTime(notification.created_at)}</p>
      </div>
    </div>
  )
}
