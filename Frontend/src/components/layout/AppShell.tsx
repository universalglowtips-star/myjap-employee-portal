import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface AppShellProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Kerangka: Sidebar (collapsible 240px/64px di desktop) + Topbar
 * (72px, brand di tengah + hamburger toggle) + content area. Sesuai
 * Implementation Contract Bagian 2B - "Kerangka: Sidebar + Topbar +
 * content area", props `children`.
 *
 * `collapsed` (desktop) dan `mobileOpen` (mobile) SENGAJA 2 piece of
 * state terpisah, bukan 1 state gabungan - keduanya di-toggle BARENG
 * lewat 1 hamburger (`toggleSidebar`), tapi yang mana yang keliatan
 * ditentuin CSS `lg:` di Sidebar/Topbar, BUKAN deteksi breakpoint via
 * JS (matchMedia/resize listener). Efeknya: toggle di desktop juga
 * mengubah `mobileOpen` tanpa efek visual (drawer-nya emang disembunyiin
 * `lg:hidden`), dan sebaliknya - simpel & gak perlu sinkronisasi resize.
 *
 * `min-w-0` di wrapper konten WAJIB - tanpa ini flex item nolak
 * menyusut di bawah lebar intrinsik kontennya (classic flexbox
 * overflow bug), yang bisa bikin horizontal scroll pas Sidebar
 * collapsed/expanded gonta-ganti lebar.
 *
 * TIDAK ada logic API/auth di sini - Sidebar & Topbar yang masing-masing
 * konsumsi authStore/PermissionGate sendiri, AppShell cuma nyusun
 * layout-nya.
 */
export function AppShell({ title, actions, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleSidebar() {
    setCollapsed((v) => !v)
    setMobileOpen((v) => !v)
  }

  function closeMobileSidebar() {
    setMobileOpen(false)
  }

  // Escape nutup drawer mobile - pola yang sama persis kayak dropdown
  // user menu di Topbar (handleEscape di situ juga).
  useEffect(() => {
    if (!mobileOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={closeMobileSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} actions={actions} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 bg-neutral-50 p-8">{children}</main>
      </div>
    </div>
  )
}
