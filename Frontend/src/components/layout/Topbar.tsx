import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Avatar } from '../ui/Avatar'

interface TopbarProps {
  /** Toggle Sidebar - collapse/expand di desktop (>=lg), buka/tutup drawer di mobile (<lg). Satu handler aja - CSS `lg:` yang nentuin mode mana yang keliatan, gak perlu deteksi breakpoint via JS. */
  onToggleSidebar: () => void
}

/**
 * Full-width, gak lagi berbagi baris sama Sidebar (restrukturisasi AppShell -
 * Topbar sekarang di ATAS Sidebar, bukan di sebelahnya) - biar brand
 * tengah BENERAN true-center relatif viewport, konsisten di kedua
 * state Sidebar (collapsed 64px / expanded 240px).
 *
 * Isinya CUMA 3 hal: hamburger (kiri) - brand (tengah) - notif+avatar
 * (kanan). Judul halaman & `actions` per-halaman PINDAH ke <main>
 * (AppShell) - Topbar murni chrome global, gak nyisain slot konten
 * per-halaman lagi.
 *
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
export function Topbar({ onToggleSidebar }: TopbarProps) {
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
    // grid-cols-[1fr_auto_1fr]: kolom tengah (brand) auto-width dan
    // BENERAN center relatif ke lebar Topbar (sekarang full-width
    // viewport, gak lagi berbagi baris sama Sidebar) - gak kegeser
    // walau kolom kiri/kanan beda lebar, beda sama flex justify-between
    // yang cuma nge-push ke ujung.
    <header className="grid h-[72px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-200 bg-white px-4 sm:gap-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Buka/tutup menu navigasi"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-neutral-600 hover:bg-neutral-50 focus:outline-none"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Brand - logo + teks "MyJAP", true-center. Teks disembunyikan
          di bawah sm biar muat di 375px, logo tetap keliatan sendirian. */}
      <div className="flex items-center justify-center gap-2">
        <img src="/logo.png" alt="MyJAP" className="h-7 w-auto shrink-0" />
        <span className="hidden font-display text-lg font-bold text-primary-600 sm:inline">
          MyJAP
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-4">
        {/* Bell - visual statis, TANPA aria-live/count dinamis (bukan fitur fungsional) */}
        <div className="relative shrink-0" aria-hidden="true">
          <Bell size={20} strokeWidth={2} className="text-neutral-600" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-status-rejected" />
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-neutral-50 focus:outline-none"
          >
            <Avatar name={employee?.full_name ?? '?'} size="default" />
            {/* Nama + jabatan 2 baris - jabatan dari employee.position.position_name
                (relasi position sekarang di-load GET /me), BUKAN teks statis.
                Disembunyikan di bawah sm (375px gak muat bareng brand tengah +
                hamburger) - avatar+chevron tetap ada, dropdown/logout tetap jalan. */}
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="font-body text-sm font-semibold text-neutral-900">
                {employee?.full_name ?? '-'}
              </span>
              <span className="font-body text-xs text-neutral-500">
                {employee?.position?.position_name ?? '-'}
              </span>
            </div>
            <ChevronDown size={14} strokeWidth={2} className="text-neutral-400" />
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
