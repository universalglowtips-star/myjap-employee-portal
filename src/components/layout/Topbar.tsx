import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Avatar } from '../ui/Avatar'

interface TopbarProps {
  title: string
  /** Slot buat aksi kontekstual per halaman (mis. Approve/Reject di Payroll Period Detail nanti) - kosong buat Langkah 8. */
  actions?: ReactNode
}

/**
 * Bell: VISUAL SAJA sesuai Figma (icon + badge merah statis) - TIDAK
 * ADA logic unread-count/dropdown notifikasi/API apapun. Itu Fase F,
 * bukan scope Langkah 8 (badge di sini cuma dekorasi tetap, BUKAN
 * fitur notifikasi fungsional - jangan dianggap sudah jadi).
 *
 * User Menu + Logout: IMPROVISASI FUNGSIONAL (disepakati eksplisit -
 * Figma cuma gambar trigger Avatar+Chevron, isi dropdown-nya
 * TIDAK ADA referensi visual). Dropdown minimal: cuma 1 aksi
 * (Logout), gak ada elemen lain di luar itu.
 */
export function Topbar({ title, actions }: TopbarProps) {
  const navigate = useNavigate()
  const employee = useAuthStore((s) => s.employee)
  const logout = useAuthStore((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-neutral-200 bg-white px-8">
      <h1 className="font-display text-xl font-semibold text-neutral-900">{title}</h1>

      <div className="flex items-center gap-4">
        {actions}

        {/* Bell - visual statis, TANPA aria-live/count dinamis (bukan fitur fungsional) */}
        <div className="relative" aria-hidden="true">
          <Bell size={20} strokeWidth={2} className="text-neutral-600" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-status-rejected" />
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 rounded-sm focus:outline-none"
          >
            <Avatar name={employee?.full_name ?? '?'} size="small" />
            <ChevronDown size={12} strokeWidth={2} className="text-neutral-400" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-40 rounded-sm border border-neutral-200 bg-white py-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-sm text-neutral-900 hover:bg-neutral-50"
              >
                <LogOut size={14} strokeWidth={2} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
