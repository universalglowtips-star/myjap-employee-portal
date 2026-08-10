import {
  Home,
  Users,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  SlidersHorizontal,
  Bell,
  List,
} from 'lucide-react'
import { SidebarNavItem } from './SidebarNavItem'
import { PermissionGate } from '../forms/PermissionGate'

/**
 * Struktur grup+item PERSIS dari Figma (App Shell Template): OVERVIEW
 * (Dashboard), PEOPLE (Karyawan/Absensi/Cuti), PAYROLL (Periode
 * Payroll/Slip Gaji/Komponen Gaji), SYSTEM (Notifikasi/Audit Log).
 *
 * Permission code per item DIVERIFIKASI, bukan ditebak:
 * - dashboard.view, employee.view, attendance.view, leave.view,
 *   payslip.view, audit-log.view -> persis dari Blueprint-Frontend-MyJAP-HRIS.md
 * - Periode Payroll -> dashboard.view (BUKAN payroll-period.view -
 *   blueprint eksplisit bilang ini SENGAJA karena halaman itu view
 *   agregat lintas karyawan, dikonfirmasi ulang baris 253 blueprint)
 * - salary-component.view -> blueprint sendiri bilang "belum eksplisit"
 *   (ditulis SEBELUM patch backend freeze), tapi backend AKTUAL
 *   (PermissionSeeder.php, diverifikasi langsung sebelumnya) sudah
 *   punya modul ini - dipakai kode yang benar-benar ada di backend,
 *   bukan blueprint yang sudah basi di poin ini
 * - Notifikasi -> "semua role" (blueprint baris 378) - TIDAK dibungkus
 *   PermissionGate sama sekali, karena gak ada permission spesifik
 *   yang membatasinya
 */
const navGroups = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: Home, permission: 'dashboard.view' }],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', label: 'Karyawan', icon: Users, permission: 'employee.view' },
      { to: '/attendance', label: 'Absensi', icon: Clock, permission: 'attendance.view' },
      { to: '/leave', label: 'Cuti', icon: Calendar, permission: 'leave.view' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/payroll/periods', label: 'Periode Payroll', icon: DollarSign, permission: 'dashboard.view' },
      { to: '/payroll/payslips', label: 'Slip Gaji', icon: FileText, permission: 'payslip.view' },
      { to: '/payroll/salary-components', label: 'Komponen Gaji', icon: SlidersHorizontal, permission: 'salary-component.view' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', label: 'Notifikasi', icon: Bell, permission: null },
      { to: '/audit-log', label: 'Audit Log', icon: List, permission: 'audit-log.view' },
    ],
  },
] as const

export function Sidebar() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="flex h-full w-[240px] flex-col gap-1 bg-sidebar px-4 pt-6"
    >
      <span className="font-display text-lg font-bold text-white">MyJAP</span>

      {navGroups.map((group) => (
        <div key={group.label} className="mt-4 flex flex-col gap-1">
          <span className="px-4 font-body text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {group.label}
          </span>
          {group.items.map((item) => {
            const navItem = <SidebarNavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
            // Item tanpa permission spesifik (Notifikasi) TIDAK dibungkus
            // PermissionGate sama sekali - render langsung.
            return item.permission ? (
              <PermissionGate key={item.to} code={item.permission}>
                {navItem}
              </PermissionGate>
            ) : (
              navItem
            )
          })}
        </div>
      ))}
    </nav>
  )
}
