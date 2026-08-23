import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface SidebarNavItemProps {
  to: string
  label: string
  icon: LucideIcon
  /** true = desktop collapsed (icon-only) - label disembunyikan via `lg:hidden`, native `title` dipasang sebagai tooltip pengganti (murah, gak butuh komponen tooltip custom). */
  collapsed?: boolean
  /** Dipanggil pas item diklik - dipakai buat nutup drawer mobile setelah navigasi. Gak ngaruh di desktop. */
  onClick?: () => void
}

/**
 * Icon: instance component Figma (16x16, Home/Users/Clock/dst) -
 * dipetakan ke lucide-react (dikonfirmasi lewat command nyata
 * sebelum coding: semua 9 nama icon yang dibutuhkan ADA di
 * lucide-react, bukan tebakan).
 *
 * Active: DARI ROUTE MATCH (useLocation), bukan prop manual/internal
 * state - sesuai Implementation Contract Bagian 2B ("Active - prop
 * dari route match via useLocation, bukan internal state").
 * `aria-current="page"` dipasang cuma pas aktif.
 *
 * PermissionGate TIDAK dipasang di sini - itu tanggung jawab Sidebar
 * (pemanggil), bukan SidebarNavItem sendiri (sesuai Contract: "Bungkus
 * tiap <SidebarNavItem> dengan <PermissionGate>" - gate di LUAR, item
 * ini presentational murni).
 *
 * Icon "rail" FIXED w-16 (64px, PERSIS lebar Sidebar collapsed) -
 * ini yang bikin posisi icon IDENTIK di kedua state (collapsed 64px
 * maupun expanded 240px) BY CONSTRUCTION, bukan hasil ngepasin
 * padding manual yang gampang geser tiap ada perubahan lain. Di
 * expanded, rail ini cuma kolom kiri, label lanjut di sebelah
 * kanannya. Di collapsed, rail ini PAS ngisi seluruh lebar Sidebar -
 * makanya rail ini juga yang dipakai buat nyamain posisi hamburger
 * di Topbar (lihat Topbar.tsx, w-16 yang sama).
 *
 * Border aktif (accent kiri) dipasang ABSOLUTE, BUKAN border-l utility
 * kayak sebelumnya - sengaja, karena border biasa "makan" 3px dari
 * box width elemen yang sama, yang bakal geser itung-itungan rail
 * icon di atas. Absolute positioning gak ikut mempengaruhi layout
 * saudara-saudaranya sama sekali.
 */
export function SidebarNavItem({ to, label, icon: Icon, collapsed = false, onClick }: SidebarNavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        // py-[6.5px] BUKAN nilai sembarang - dihitung presisi:
        // text-sm line-height Tailwind = 20px (dikonfirmasi dari CSS
        // compiled: 14px * calc(1.25/.875) = 20px), target tinggi
        // total item dari audit Figma = 33px. 33-20=13px padding
        // total, dibagi rata 6.5px atas-bawah. Icon 16px < 20px teks,
        // jadi gak pengaruh ke perhitungan tinggi (teks yang dominan).
        'relative flex items-center rounded-sm py-[6.5px] font-body text-sm transition-colors',
        isActive
          ? 'bg-primary-50 font-medium text-primary-600'
          : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 left-0 w-[3px]', isActive ? 'bg-primary-600' : 'bg-transparent')}
      />
      <span className="flex w-16 shrink-0 items-center justify-center">
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={cn('pr-4', collapsed && 'lg:hidden')}>{label}</span>
    </Link>
  )
}
