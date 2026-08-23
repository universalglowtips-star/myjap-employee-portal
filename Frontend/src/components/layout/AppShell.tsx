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
 * Kerangka: Topbar FULL-WIDTH (72px, brand true-center relatif
 * viewport) di paling atas, Sidebar (collapsible 240px/64px di
 * desktop) + Main Content di baris terpisah DI BAWAH Topbar - bukan
 * sejajar kayak sebelumnya. Efeknya brand di tengah Topbar gak lagi
 * kepotong lebar Sidebar sama sekali, jadi beneran center konsisten
 * di kedua state (collapsed 64px / expanded 240px).
 *
 * Judul halaman (`title`) DIRENDER DI SINI (di dalam <main>), BUKAN
 * di Topbar - Topbar final cuma hamburger + brand + notif/avatar,
 * gak ada teks yang panjangnya beda-beda per halaman. `actions`
 * (mis. tombol "Tambah Departemen" di DepartmentListPage) ikut
 * dipindah ke sini juga (disandingkan sama title, pola title+action-
 * button standar) - Topbar final gak nyisain slot generik buat
 * konten per-halaman lagi.
 *
 * `collapsed` (desktop) dan `mobileOpen` (mobile) SENGAJA 2 piece of
 * state terpisah, bukan 1 state gabungan - keduanya di-toggle BARENG
 * lewat 1 hamburger (`toggleSidebar`), tapi yang mana yang keliatan
 * ditentuin CSS `lg:` di Sidebar, BUKAN deteksi breakpoint via JS
 * (matchMedia/resize listener). Efeknya: toggle di desktop juga
 * mengubah `mobileOpen` tanpa efek visual (drawer-nya emang disembunyiin
 * `lg:hidden`), dan sebaliknya - simpel & gak perlu sinkronisasi resize.
 *
 * `min-w-0` di baris Sidebar+Main WAJIB - tanpa ini flex item nolak
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
    <div className="flex min-h-screen flex-col">
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className="flex min-w-0 flex-1">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={closeMobileSidebar} />
        <main className="min-w-0 flex-1 bg-neutral-50 p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="font-display text-xl font-semibold text-neutral-900">{title}</h1>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
