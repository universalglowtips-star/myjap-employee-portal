import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { usePermission } from '../../../lib/permissions'
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationContent } from './NotificationContent'

const PREVIEW_COUNT = 10

/**
 * Ganti total bell statis Topbar (dulu "Fase F" - badge merah
 * hardcoded, nol logic). Sekarang: unread-count di-poll 30 detik
 * (bukan real-time - dikonfirmasi gak ada broadcasting/WebSocket
 * sama sekali di backend), badge HILANG TOTAL kalau count 0 (bukan
 * dot kosong), dan daftar preview di dropdown baru di-fetch pas
 * dropdown DIBUKA (`enabled: open`) - gak nge-hit /notifications
 * terus-terusan tiap 30 detik kayak count-nya, cuma pas beneran
 * dilihat user.
 *
 * Item di dalam dropdown SENGAJA gak clickable individual (gak ada
 * mark-as-read di sini) - instruksi tugas cuma nyebut itu buat
 * halaman penuh (Bagian B), dropdown ini murni preview + tombol
 * "Lihat Semua".
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const canView = usePermission('notification.view')

  const { data: unreadCount } = useUnreadNotificationCount(canView)
  const { data: notifications, isLoading, isError } = useNotifications({ page: 1, per_page: PREVIEW_COUNT }, canView && open)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!canView) return null

  const count = unreadCount ?? 0

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'}
        className="flex h-11 w-11 items-center justify-center rounded-sm text-neutral-600 hover:bg-neutral-50 focus:outline-none"
      >
        <span className="relative inline-flex">
          <Bell size={20} strokeWidth={2} />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-rejected px-1 font-body text-[10px] font-semibold leading-none text-white"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-sm border border-neutral-200 bg-white shadow-lg">
          {/* tabIndex=0 + role/aria-label WAJIB - div scroll internal
              (max-h-96 + overflow-y-auto) tanpa ini gak bisa di-scroll
              pakai keyboard sama sekali (axe rule scrollable-region-
              focusable, dikonfirmasi kena pas sweep). role="region" +
              aria-label kasih konteks screen reader begitu elemen ini
              fokus, bukan cuma numpang lolos automated check. */}
          <div
            className="max-h-96 overflow-y-auto p-1"
            tabIndex={0}
            role="region"
            aria-label="Daftar notifikasi terbaru"
          >
            {isLoading ? (
              <div className="p-3">
                <div className="h-16 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
              </div>
            ) : isError ? (
              <p className="p-3 font-body text-sm text-status-rejected">Gagal memuat notifikasi.</p>
            ) : (notifications?.data.length ?? 0) === 0 ? (
              <p className="p-3 text-center font-body text-sm text-neutral-600">Tidak ada notifikasi.</p>
            ) : (
              notifications?.data.map((n) => <NotificationContent key={n.id} notification={n} />)
            )}
          </div>
          <div className="border-t border-neutral-200 p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/notifications')
              }}
              className="w-full rounded-sm px-3 py-2 text-center font-body text-sm font-medium text-primary-600 hover:bg-neutral-50"
            >
              Lihat Semua
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
