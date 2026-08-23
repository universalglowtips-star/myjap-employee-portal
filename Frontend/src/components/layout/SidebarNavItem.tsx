import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface SidebarNavItemProps {
  to: string
  label: string
  icon: LucideIcon
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
 */
export function SidebarNavItem({ to, label, icon: Icon }: SidebarNavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        // py-[6.5px] BUKAN nilai sembarang - dihitung presisi:
        // text-sm line-height Tailwind = 20px (dikonfirmasi dari CSS
        // compiled: 14px * calc(1.25/.875) = 20px), target tinggi
        // total item dari audit Figma = 33px. 33-20=13px padding
        // total, dibagi rata 6.5px atas-bawah. Icon 16px < 20px teks,
        // jadi gak pengaruh ke perhitungan tinggi (teks yang dominan).
        // border-l-[3px] dipasang di KEDUA state (transparent kalau
        // non-aktif) supaya lebar konten gak "loncat" pas item jadi aktif.
        'flex items-center gap-2 rounded-sm border-l-[3px] px-[13px] py-[6.5px] font-body text-sm transition-colors',
        isActive
          ? 'border-primary-600 bg-primary-50 font-medium text-primary-600'
          : 'border-transparent text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
      )}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      {label}
    </Link>
  )
}
