import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { formatDate } from '../../../lib/formatDate'
import { cn } from '../../../lib/cn'
import { useAttendanceMonitoring, todayDateString, firstDayOfMonthString } from '../hooks/useAttendanceMonitoring'
import { useOfficeLocationsForFilter } from '../hooks/useOfficeLocationsForFilter'
import { useActiveEmployeesForFilter } from '../hooks/useActiveEmployeesForFilter'
import { aggregateAttendanceByEmployee } from '../lib/attendanceAggregation'
import { exportTableToCsv, exportTableToExcel, exportTableToPdf, type ExportTable } from '../lib/attendanceExport'
import { AttendanceExportMenu, type AttendanceExportFormat } from '../components/AttendanceExportMenu'
import { AttendanceDailyDetailTab } from '../components/AttendanceDailyDetailTab'
import { AttendanceEmployeeSummaryTab } from '../components/AttendanceEmployeeSummaryTab'

const TABS = [
  { key: 'daily', label: 'Rincian Harian' },
  { key: 'summary', label: 'Ringkasan per Karyawan' },
] as const

type TabKey = (typeof TABS)[number]['key']

/** "HH:MM" dari datetime UTC backend, dipakai lagi di sini buat baris export Tab Rincian Harian (sama persis Tab-nya sendiri). */
function formatTime(datetime: string | null): string {
  if (!datetime) return '-'
  const d = new Date(datetime.replace(' ', 'T') + 'Z')
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d)
}

/**
 * Monitoring Absensi Admin (Task 10) - KHUSUS role dengan dashboard.view
 * (DIRECTOR/MANAGER/FINANCE/HRD/SUPER_ADMIN). Percabangan permission di
 * App.tsx (AttendanceRoute) yang nentuin komponen ini vs
 * AttendanceHistoryPage.tsx (EMPLOYEE) yang kerender - TAPI tetap
 * dibungkus PermissionGate attendance.view di sini juga (defense-in-depth,
 * pola sama persis AuditLogListPage/NotificationListPage/EmployeeDetailPage) -
 * FINANCE eksplisit PUNYA dashboard.view TAPI TIDAK PUNYA attendance.view
 * (dikonfirmasi investigasi), jadi kalau FINANCE nyasar ke sini lewat URL
 * langsung (nav Sidebar-nya sendiri sudah gak nampilin link ini), tetap
 * ketahan halaman "akses ditolak", bukan crash/data kosong tanpa penjelasan.
 *
 * SATU fetch (useAttendanceMonitoring, fetch-semua-halaman) dipakai
 * bareng buat KEDUA tab + tombol Ekspor - lihat komentar lengkap di
 * hook-nya. ScopesOwnData TIDAK aktif buat role non-EMPLOYEE
 * (dikonfirmasi investigasi) - endpoint yang sama otomatis balikin
 * data SEMUA karyawan di sini, TANPA employee_id manual kecuali admin
 * eksplisit milih filter Karyawan.
 */
export function AttendanceMonitoringPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const tab: TabKey = searchParams.get('tab') === 'summary' ? 'summary' : 'daily'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const startDate = searchParams.get('start_date') ?? firstDayOfMonthString()
  const endDate = searchParams.get('end_date') ?? todayDateString()
  const officeLocationId = searchParams.get('office_location_id') ?? ''
  const employeeId = searchParams.get('employee_id') ?? ''

  const { data: officeLocations, isError: isOfficeLocationsError } = useOfficeLocationsForFilter()
  const { data: employees, isError: isEmployeesError } = useActiveEmployeesForFilter()
  const {
    data: rows,
    isLoading,
    isError,
  } = useAttendanceMonitoring({ startDate, endDate, officeLocationId, employeeId })

  const summary = useMemo(() => aggregateAttendanceByEmployee(rows ?? []), [rows])

  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  function handleTabChange(newTab: TabKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', newTab)
      next.delete('page')
      return next
    })
  }

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  function handleEmployeeClickFromSummary(clickedEmployeeId: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'daily')
      next.set('employee_id', String(clickedEmployeeId))
      next.delete('page')
      return next
    })
  }

  const officeLocationLabel = officeLocationId
    ? (officeLocations ?? []).find((o) => String(o.id) === officeLocationId)?.office_name ?? 'Semua Cabang'
    : 'Semua Cabang'

  function handleExport(format: AttendanceExportFormat) {
    const isDaily = tab === 'daily'

    const table: ExportTable = isDaily
      ? {
          headers: ['Tanggal', 'Nama Karyawan', 'Cabang', 'Jam Masuk', 'Jam Pulang', 'Status', 'Di Luar Radius'],
          rows: (rows ?? []).map((row) => [
            formatDate(row.attendance_date),
            row.employee?.full_name ?? '-',
            row.office_location?.office_name ?? '-',
            formatTime(row.check_in),
            formatTime(row.check_out),
            row.attendance_status,
            !row.is_valid_location ? 'Ya' : 'Tidak',
          ]),
        }
      : {
          headers: ['Nama Karyawan', 'Cabang', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Cuti/Izin', 'Di Luar Radius'],
          rows: summary.map((s) => [
            s.employee_name,
            s.office_location_name,
            s.present,
            s.late,
            s.absent,
            s.leaveOrPermission,
            s.outsideRadius,
          ]),
        }

    const namePart = isDaily ? 'rincian-harian' : 'ringkasan-karyawan'
    const filenameBase = `absensi-${namePart}_${startDate}_${endDate}`
    const title = isDaily ? 'Rincian Harian Absensi' : 'Ringkasan Absensi per Karyawan'
    const subtitle = `${formatDate(startDate)} s.d. ${formatDate(endDate)} — Cabang: ${officeLocationLabel}`

    if (format === 'csv') exportTableToCsv(table, `${filenameBase}.csv`)
    else if (format === 'excel') exportTableToExcel(table, `${filenameBase}.xlsx`)
    else exportTableToPdf(table, `${filenameBase}.pdf`, title, subtitle)
  }

  const officeOptions = [
    { value: '', label: 'Semua Cabang' },
    ...(officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name })),
  ]

  const employeeOptions = [
    { value: '', label: 'Semua Karyawan' },
    ...(employees ?? []).map((e) => ({ value: String(e.id), label: e.full_name })),
  ]

  const hasExportableData = tab === 'daily' ? (rows?.length ?? 0) > 0 : summary.length > 0

  return (
    <AppShell title="Absensi" actions={<AttendanceExportMenu disabled={!hasExportableData} onExport={handleExport} />}>
      <PermissionGate
        code="attendance.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        {/* Filter card - pola sama persis AuditLogListPage.tsx (grid Label+Input/Select, rounded-md bg-white p-4 shadow-sm). */}
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-start-date">Dari Tanggal</Label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => updateFilter('start_date', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-end-date">Sampai Tanggal</Label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => updateFilter('end_date', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-office-location">Cabang</Label>
              <Select
                id="filter-office-location"
                options={officeOptions}
                disabled={isOfficeLocationsError}
                value={officeLocationId}
                onChange={(e) => updateFilter('office_location_id', e.target.value)}
              />
              {isOfficeLocationsError && (
                <p className="font-body text-xs text-status-rejected">Gagal memuat daftar cabang.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-employee">Karyawan</Label>
              <Select
                id="filter-employee"
                options={employeeOptions}
                disabled={isEmployeesError}
                value={employeeId}
                onChange={(e) => updateFilter('employee_id', e.target.value)}
              />
              {isEmployeesError && (
                <p className="font-body text-xs text-status-rejected">Gagal memuat daftar karyawan.</p>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher - pola sama persis EmployeeDetailPage.tsx (border-b-2,
            text-primary-700 aktif/text-neutral-600 nonaktif - duduk di atas
            bg-neutral-50 AppShell, BUKAN kartu putih, jadi primary-600 gagal
            AA di sini persis alasan yang sama). */}
        <div className="mb-4 flex gap-4 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={cn(
                'font-body text-sm font-medium pb-1.5 -mb-px border-b-2',
                tab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'daily' ? (
          <AttendanceDailyDetailTab
            rows={rows ?? []}
            isLoading={isLoading}
            isError={isError}
            page={page}
            onPageChange={handlePageChange}
          />
        ) : (
          <AttendanceEmployeeSummaryTab
            summary={summary}
            isLoading={isLoading}
            isError={isError}
            onEmployeeClick={handleEmployeeClickFromSummary}
          />
        )}
      </PermissionGate>
    </AppShell>
  )
}
