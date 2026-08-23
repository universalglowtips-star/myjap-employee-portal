import {
  Home,
  Users,
  Clock,
  Calendar,
  Building,
  Briefcase,
  Timer,
  MapPin,
  DollarSign,
  FileText,
  SlidersHorizontal,
  Layers,
  Workflow,
  ShieldCheck,
  Bell,
  List,
} from 'lucide-react'
import { SidebarNavItem } from './SidebarNavItem'
import { PermissionGate } from '../forms/PermissionGate'
import { cn } from '../../lib/cn'

/**
 * Struktur grup+item: OVERVIEW (Dashboard), PEOPLE (Karyawan/Absensi/
 * Cuti), MASTER DATA (Departemen/Posisi/Shift Kerja/Lokasi Kantor/
 * Komponen Gaji - grup baru, ditambahkan di antara People & Payroll),
 * PAYROLL (Periode Payroll/Slip Gaji/Proses Massal Payroll/Alur
 * Approval), SYSTEM (Role & Permission/Notifikasi/Audit Log).
 *
 * Komponen Gaji PINDAH dari grup Payroll ke Master Data - `to` path-nya
 * SENGAJA tetap '/payroll/salary-components' (gak diubah), cuma
 * posisinya di sidebar yang pindah grup.
 *
 * Permission code per item DIVERIFIKASI, bukan ditebak:
 * - dashboard.view, employee.view, attendance.view, leave.view,
 *   payslip.view, audit-log.view -> persis dari Blueprint-Frontend-MyJAP-HRIS.md
 * - Periode Payroll -> dashboard.view (BUKAN payroll-period.view -
 *   blueprint eksplisit bilang ini SENGAJA karena halaman itu view
 *   agregat lintas karyawan, dikonfirmasi ulang baris 253 blueprint).
 *   Inkonsistensi ini SENGAJA - JANGAN diperbaiki tanpa instruksi eksplisit.
 * - salary-component.view -> blueprint sendiri bilang "belum eksplisit"
 *   (ditulis SEBELUM patch backend freeze), tapi backend AKTUAL
 *   (PermissionSeeder.php, diverifikasi langsung sebelumnya) sudah
 *   punya modul ini - dipakai kode yang benar-benar ada di backend,
 *   bukan blueprint yang sudah basi di poin ini
 * - department.view, position.view, work-shift.view, office-location.view,
 *   payroll.generate-bulk, approval-workflow.view, role.view -> string
 *   apa adanya dari daftar tugas, generik, gak ada perlakuan khusus
 *   per item walau beda pola penamaan (mis. payroll.generate-bulk)
 * - Notifikasi -> "semua role" (blueprint baris 378) - TIDAK dibungkus
 *   PermissionGate sama sekali, karena gak ada permission spesifik
 *   yang membatasinya
 *
 * Route untuk item Master Data/Payroll/System yang halamannya BELUM
 * dibangun (Posisi, Shift Kerja, Lokasi Kantor, Proses Massal Payroll,
 * Alur Approval, Role & Permission) dikasih path konvensional
 * mengikuti pola item lain yang sudah lebih dulu ada di sidebar tanpa
 * route terdaftar di App.tsx (mis. /employees, /attendance) - BUKAN
 * halaman baru, cuma nav target yang nunggu giliran dibangun.
 *
 * Brand (logo + teks "MyJAP") SUDAH PINDAH ke Topbar (tengah) - Sidebar
 * mulai langsung dari grup menu, gak ada header brand lagi di sini
 * (biar gak duplikat di 2 tempat).
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
    label: 'Master Data',
    items: [
      { to: '/departments', label: 'Departemen', icon: Building, permission: 'department.view' },
      { to: '/positions', label: 'Posisi', icon: Briefcase, permission: 'position.view' },
      { to: '/work-shifts', label: 'Shift Kerja', icon: Timer, permission: 'work-shift.view' },
      { to: '/office-locations', label: 'Lokasi Kantor', icon: MapPin, permission: 'office-location.view' },
      { to: '/payroll/salary-components', label: 'Komponen Gaji', icon: SlidersHorizontal, permission: 'salary-component.view' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/payroll/periods', label: 'Periode Payroll', icon: DollarSign, permission: 'dashboard.view' },
      { to: '/payroll/payslips', label: 'Slip Gaji', icon: FileText, permission: 'payslip.view' },
      { to: '/payroll/bulk-process', label: 'Proses Massal Payroll', icon: Layers, permission: 'payroll.generate-bulk' },
      { to: '/payroll/approval-workflow', label: 'Alur Approval', icon: Workflow, permission: 'approval-workflow.view' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/roles', label: 'Role & Permission', icon: ShieldCheck, permission: 'role.view' },
      { to: '/notifications', label: 'Notifikasi', icon: Bell, permission: null },
      { to: '/audit-log', label: 'Audit Log', icon: List, permission: 'audit-log.view' },
    ],
  },
] as const

interface SidebarProps {
  /** true = Sidebar ciut jadi 64px icon-only - HANYA berlaku di desktop (>=lg), lewat class `lg:`. Di mobile gak ngaruh, itu urusan drawer di bawah. */
  collapsed: boolean
  /** true = drawer mobile (<lg) kebuka. Gak ngaruh di desktop (>=lg, Sidebar statis & selalu keliatan di sana). */
  mobileOpen: boolean
  /** Dipanggil pas item nav diklik ATAU backdrop di-tap - nutup drawer mobile. Diteruskan ke tiap SidebarNavItem sebagai onClick. */
  onClose: () => void
}

export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop - cuma ada di mobile (<lg), dan cuma dirender pas drawer kebuka. lg:hidden jaga-jaga kalau mobileOpen kebawa nyampe ke desktop (gak seharusnya kejadian, tapi gak boleh nutupin apa-apa di sana). */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav
        aria-label="Navigasi utama"
        className={cn(
          // fixed + translate-x buat slide drawer di mobile (default,
          // <lg). lg:static ngembaliin ke flex layout normal Topbar+
          // AppShell di desktop, lg:translate-x-0 mastiin gak ketinggalan
          // ke-translate walau mobileOpen false.
          'fixed inset-y-0 left-0 z-50 flex h-full w-[240px] flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-neutral-200 bg-white px-4 pt-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:transition-[width] lg:duration-200 lg:ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-16 lg:px-2'
        )}
      >
        {navGroups.map((group) => (
          <div key={group.label} className="mt-4 flex flex-col gap-1">
            <span
              className={cn(
                'px-4 font-body text-[11px] font-medium uppercase tracking-wide text-neutral-400',
                collapsed && 'lg:hidden'
              )}
            >
              {group.label}
            </span>
            {group.items.map((item) => {
              const navItem = (
                <SidebarNavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  onClick={onClose}
                />
              )
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
    </>
  )
}
