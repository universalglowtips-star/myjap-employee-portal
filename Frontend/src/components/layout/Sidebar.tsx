import { useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  Landmark,
  Layers,
  Workflow,
  ShieldCheck,
  Bell,
  List,
  ChevronDown,
  KeyRound,
} from 'lucide-react'
import { SidebarNavItem } from './SidebarNavItem'
import { PermissionGate } from '../forms/PermissionGate'
import { useAuthStore } from '../../stores/authStore'
import { evaluatePermission } from '../../permissions/evaluatePermission'
import { cn } from '../../lib/cn'

/**
 * Struktur grup+item: OVERVIEW (Dashboard ATAU Beranda, lihat catatan
 * di bawah), PEOPLE (Karyawan/Absensi/Cuti), MASTER DATA (Departemen/
 * Posisi/Shift Kerja/Lokasi Kantor/Komponen Gaji - grup baru,
 * ditambahkan di antara People & Payroll), PAYROLL (Periode Payroll/
 * Slip Gaji/Proses Massal Payroll/Alur Approval), SYSTEM (Role &
 * Permission/Notifikasi/Audit Log).
 *
 * OVERVIEW - item "Dashboard" (permission dashboard.view) DIGANTI
 * "Beranda" (tanpa permission, selalu tampil) buat role yang gak punya
 * dashboard.view (EMPLOYEE). SEBELUMNYA grup ini kosong total buat
 * EMPLOYEE (satu-satunya item-nya disembunyikan, PermissionGate cuma
 * nyembunyiin item bukan grupnya) - EMPLOYEE gak punya cara balik ke
 * "/" dari halaman lain sama sekali. Kedua item ngarah ke path yang
 * SAMA ("/") - HomeRoute (App.tsx) yang branch render Dashboard vs
 * EmployeeHomePage berdasar permission yang sama, jadi cukup 1 item
 * per role, gak pernah dua-duanya sekaligus. `buildNavGroups()`
 * (BUKAN konstanta statis lagi) karena pilihan item ini butuh tau
 * `canViewDashboard` yang cuma ada di render time (hook).
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
interface NavItem {
  to: string
  label: string
  icon: typeof Home
  permission: string | null
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Kategori sidebar jadi accordion (permintaan Bagus, pola interaksi
 * dicontoh dari app SiCepat - BUKAN warna/branding-nya). Aturan final
 * Bagus:
 * 1. Default SEMUA kategori collapsed, KECUALI kategori yang berisi
 *    halaman aktif saat ini - itu auto-expand.
 * 2. Expand manual kategori LAIN (di luar kategori aktif) disimpan ke
 *    localStorage, bertahan lewat reload.
 * 3. Auto-expand kategori aktif SELALU MENANG - localStorage cuma
 *    dipakai buat kategori yang BUKAN kategori aktif saat ini.
 *
 * `isGroupExpanded()`/`toggleGroup()` di bawah mengimplementasikan
 * OR sederhana (aktif || tersimpan) tiap render - toggle dihitung dari
 * state EFEKTIF (yang keliatan), bukan nilai mentah tersimpan, supaya
 * klik di kategori yang lagi dipaksa expand (karena aktif) tetap
 * kesimpen sebagai "false" - gak kelihatan berubah SEKARANG (aktif
 * masih menang), tapi begitu pindah ke kategori lain preferensi itu
 * kepake.
 */
const SIDEBAR_EXPANDED_GROUPS_KEY = 'myjap-sidebar-expanded-groups'

function loadStoredExpandedGroups(): Record<string, boolean> {
  const raw = localStorage.getItem(SIDEBAR_EXPANDED_GROUPS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

/**
 * Match "aktif" buat kepentingan auto-expand kategori BEDA dari
 * `isActive` di SidebarNavItem (exact match doang, buat highlight biru
 * item itu sendiri - TIDAK diubah, di luar scope instruksi ini).
 * Di sini SENGAJA prefix-aware (`pathname` diawali `to + '/'` juga
 * dianggap match) - biar halaman turunan/detail (mis. `/payroll/periods/4`,
 * `/employees/new`) tetap ngenalin kategori induknya buat di-expand,
 * bukan cuma pas persis di halaman list-nya. `to === '/'` dikecualikan
 * (exact match doang) - kalau enggak, Overview bakal selalu "aktif"
 * di halaman manapun (semua path diawali '/').
 */
function isItemActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function buildNavGroups(canViewDashboard: boolean): NavGroup[] {
  return [
    {
      label: 'Overview',
      items: canViewDashboard
        ? [{ to: '/', label: 'Dashboard', icon: Home, permission: 'dashboard.view' }]
        : [{ to: '/', label: 'Beranda', icon: Home, permission: null }],
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
        { to: '/payroll/salary-rates-by-branch', label: 'Tarif per Cabang', icon: Landmark, permission: 'employee.update' },
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
        // Fitur 2FA (2026-09-21) - permission: null (tampil ke SEMUA role,
        // sama pola Notifikasi) SENGAJA, bukan permission code baru -
        // gating akses SEBENARNYA 100% di backend (403 kalau role gak
        // wajib 2FA), SecurityPage sendiri yang nampilin pesan "belum
        // tersedia" buat role yang gak cocok. Konsisten "1 halaman
        // Keamanan Akun buat semua orang", bukan menu yang muncul-hilang.
        { to: '/security', label: 'Keamanan Akun', icon: KeyRound, permission: null },
      ],
    },
  ]
}

interface SidebarProps {
  /** true = Sidebar ciut jadi 64px icon-only - HANYA berlaku di desktop (>=lg), lewat class `lg:`. Di mobile gak ngaruh, itu urusan drawer di bawah. */
  collapsed: boolean
  /** true = drawer mobile (<lg) kebuka. Gak ngaruh di desktop (>=lg, Sidebar statis & selalu keliatan di sana). */
  mobileOpen: boolean
  /** Dipanggil pas item nav diklik ATAU backdrop di-tap - nutup drawer mobile. Diteruskan ke tiap SidebarNavItem sebagai onClick. */
  onClose: () => void
}

export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  // Fix bug: grup yang SEMUA item-nya tersembunyi (user gak punya
  // permission satupun di grup itu) sebelumnya tetap nampilin LABEL
  // grup kosong (PermissionGate cuma nyembunyiin item di dalamnya,
  // bukan grup pembungkusnya). Filter di sini SEBELUM render, pakai
  // evaluatePermission() murni yang sama dipakai PermissionGate/
  // usePermission - bukan logic baru, biar hasilnya konsisten 1:1
  // sama item yang beneran kerender. Subscribe reaktif ke permissions/
  // role (BUKAN hasPermission() non-reaktif dari lib/permissions.ts)
  // supaya Sidebar re-render begitu GET /me kelar pas login/refresh.
  const permissions = useAuthStore((s) => s.permissions)
  const isSuperAdmin = useAuthStore((s) => s.employee?.role?.role_code === 'SUPER_ADMIN')
  const canViewDashboard = evaluatePermission(permissions, isSuperAdmin, 'dashboard.view')

  const location = useLocation()
  const [storedExpanded, setStoredExpanded] = useState<Record<string, boolean>>(loadStoredExpandedGroups)

  const navGroups = buildNavGroups(canViewDashboard)
  const visibleGroups = navGroups.filter((group) =>
    group.items.some(
      (item) => item.permission === null || evaluatePermission(permissions, isSuperAdmin, item.permission)
    )
  )

  const activeGroupLabel = visibleGroups.find((group) =>
    group.items.some((item) => isItemActive(location.pathname, item.to))
  )?.label

  function isGroupExpanded(label: string): boolean {
    return label === activeGroupLabel || (storedExpanded[label] ?? false)
  }

  function toggleGroup(label: string) {
    const next = { ...storedExpanded, [label]: !isGroupExpanded(label) }
    setStoredExpanded(next)
    localStorage.setItem(SIDEBAR_EXPANDED_GROUPS_KEY, JSON.stringify(next))
  }

  return (
    <>
      {/* Backdrop - cuma ada di mobile (<lg), dan cuma dirender pas drawer kebuka. top-[72px] (BUKAN inset-0/top-0) - Topbar sekarang full-width DI ATAS baris Sidebar+Main, jadi backdrop cuma perlu nutupin area di bawahnya, Topbar sendiri gak boleh ketutup. lg:hidden jaga-jaga kalau mobileOpen kebawa nyampe ke desktop (gak seharusnya kejadian, tapi gak boleh nutupin apa-apa di sana). */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-neutral-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav
        aria-label="Navigasi utama"
        className={cn(
          // fixed + translate-x buat slide drawer di mobile (default,
          // <lg), mulai dari top-[72px] (di bawah Topbar, BUKAN dari
          // atas viewport) sampai bottom-0. lg:static ngembaliin ke flex
          // layout normal (baris Sidebar+Main) di desktop, lg:h-full
          // biar tetap ngisi tinggi baris itu (top/bottom diabaikan
          // browser pas position:static), lg:translate-x-0 mastiin gak
          // ketinggalan ke-translate walau mobileOpen false.
          //
          // SENGAJA gak ada px-* di sini (beda dari sebelumnya) - nav
          // padding bakal ikut nggeser posisi icon rail (lihat
          // SidebarNavItem, w-16 fixed) kalau nilainya beda antara
          // collapsed/expanded. Item mulai PERSIS dari left-0 di kedua
          // state, biar icon rail-nya konsisten by construction.
          'sidebar-nav-scroll fixed bottom-0 left-0 top-[72px] z-50 flex w-[240px] flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-neutral-200 bg-white pt-6 transition-transform duration-200 ease-in-out lg:static lg:h-full lg:translate-x-0 lg:transition-[width] lg:duration-200 lg:ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-16'
        )}
      >
        {visibleGroups.map((group, index) => {
          const expanded = isGroupExpanded(group.label)
          const groupContentId = `sidebar-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`

          return (
            <div key={group.label} className="mt-4 flex flex-col gap-1">
              {/* Divider - CUMA muncul di collapsed (lg:block di-gate
                  `collapsed`, bukan cuma breakpoint) DAN cuma di antara
                  grup (index>0, gak ada divider sebelum grup pertama -
                  index di sini udah dihitung dari visibleGroups, jadi
                  "grup pertama" berarti pertama yang BENERAN kerender,
                  bukan posisi asli di navGroups).
                  Di expanded, `hidden` (default) tetap berlaku - label
                  grup di bawah ini yang jadi pemisah visual, JANGAN
                  dobel. mx-4+mb-2 kasih jarak dikit biar gak nempel ke
                  icon di atas/bawahnya. */}
              {index > 0 && (
                <div
                  aria-hidden="true"
                  className={cn('hidden', collapsed && 'lg:mx-4 lg:mb-2 lg:block lg:border-t lg:border-neutral-200')}
                />
              )}
              {/* Header kategori jadi tombol accordion (permintaan Bagus,
                  pola SiCepat). Di collapsed (icon-rail desktop) TETAP
                  `lg:hidden` kayak span sebelumnya - gak ada ruang buat
                  header+chevron di rail 64px, dan accordion gak relevan
                  di situ (lihat grid-rows di bawah, dipaksa selalu
                  terbuka lewat `lg:grid-rows-[1fr]`).
                  pl-16 (BUKAN px-4) - nyamain sama posisi mulainya teks
                  label item di bawahnya (w-16 icon rail + label).
                  text-neutral-600 (BUKAN neutral-400 - kontras 2.94:1
                  terhadap putih, GAGAL WCAG AA. neutral-600 = 7.19:1,
                  lolos jauh di atas ambang 4.5:1). */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={expanded}
                aria-controls={groupContentId}
                className={cn(
                  'flex items-center justify-between gap-2 pl-16 pr-4 font-body text-[11px] font-medium uppercase tracking-wide text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:text-primary-700',
                  collapsed && 'lg:hidden'
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={cn('shrink-0 transition-transform duration-200 ease-in-out', !expanded && '-rotate-90')}
                />
              </button>
              {/* Accordion collapse/expand murni CSS (grid-template-rows
                  0fr<->1fr + overflow-hidden di wrapper dalam) - gak ada
                  library animasi di project ini, dan trik ini gak butuh
                  tau tinggi konten di muka (beda dari max-height magic
                  number yang gampang salah kalau daftar item berubah).
                  Base class (tanpa `lg:`) berlaku di SEMUA lebar TERMASUK
                  desktop expanded - `lg:grid-rows-[1fr]` HANYA override
                  pas collapsed (icon-rail), maksa selalu penuh kebuka
                  karena gak ada header buat toggle di mode itu. */}
              <div
                id={groupContentId}
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-in-out',
                  expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  collapsed && 'lg:grid-rows-[1fr]'
                )}
              >
                <div className="flex flex-col gap-1 overflow-hidden">
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
              </div>
            </div>
          )
        })}
      </nav>
    </>
  )
}
