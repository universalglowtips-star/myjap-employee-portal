import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { formatCurrency } from '../../../lib/formatCurrency'
import { formatMonthYear, MONTH_NAMES } from '../lib/payslipFormat'
import { usePayslips } from '../hooks/usePayslips'
import { usePayslipDetailTarget } from '../hooks/usePayslipDetailTarget'
import { useActiveEmployeesForFilter } from '../../attendance/hooks/useActiveEmployeesForFilter'
import { useOfficeLocationsForFilter } from '../../attendance/hooks/useOfficeLocationsForFilter'
import { useDepartments } from '../../master-data/hooks/useDepartments'
import { PayslipDetailModal } from '../components/PayslipDetailModal'
import type { Payslip } from '../../../api/types/payslip'

const PER_PAGE = 15

const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }))

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Published', label: 'Published' },
]

/**
 * Slip Gaji - view Admin/HRD/Finance/Director/Manager (Task 12 Bagian
 * C.3) - KHUSUS role DENGAN dashboard.view. Percabangan permission ada
 * di App.tsx (PayslipRoute), pola sama persis
 * AttendanceMonitoringPage/LeaveAdminPage (Task 10/11).
 *
 * Filter Cabang (office_location_id) ditambahkan sesi follow-up
 * TERPISAH dari Task 12 utama (commit 3fd10f0) - awalnya sengaja
 * dilewatin karena GET /payslips belum dukung param itu, sekarang
 * backend-nya sudah ditambah (additive, disetujui eksplisit terpisah
 * dari backend freeze Task 12). Reuse useOfficeLocationsForFilter.ts
 * (Task 10, attendance feature) apa adanya - auto-update dari data
 * Lokasi Kantor asli, bukan hardcode.
 *
 * TIDAK ADA tombol create/generate/edit/delete/publish/unpublish di
 * halaman ini sama sekali - PayslipController.php punya semua method
 * itu, tapi murni di luar scope Task 12 (view-only, jelas eksplisit
 * di instruksi tugas).
 */
export function PayslipAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { detailId, openDetail, closeDetail } = usePayslipDetailTarget()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const employeeId = searchParams.get('employee_id') ?? ''
  const departmentId = searchParams.get('department_id') ?? ''
  const month = searchParams.get('month') ?? ''
  const year = searchParams.get('year') ?? ''
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const officeLocationId = searchParams.get('office_location_id') ?? ''

  const { data, isLoading, isError } = usePayslips({
    employee_id: employeeId ? Number(employeeId) : undefined,
    department_id: departmentId ? Number(departmentId) : undefined,
    office_location_id: officeLocationId ? Number(officeLocationId) : undefined,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    status: status || undefined,
    search: search || undefined,
    per_page: PER_PAGE,
    page,
  })
  const { data: employees, isError: isEmployeesError } = useActiveEmployeesForFilter()
  const { data: departments, isError: isDepartmentsError } = useDepartments()
  const { data: officeLocations, isError: isOfficeLocationsError } = useOfficeLocationsForFilter()

  const rows = data?.data ?? []

  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  const employeeOptions = [
    { value: '', label: 'Semua Karyawan' },
    ...(employees ?? []).map((e) => ({ value: String(e.id), label: e.full_name })),
  ]
  const departmentOptions = [
    { value: '', label: 'Semua Departemen' },
    ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.department_name })),
  ]
  const officeLocationOptions = [
    { value: '', label: 'Semua Cabang' },
    ...(officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name })),
  ]

  return (
    <AppShell title="Slip Gaji">
      <PermissionGate
        code="payslip.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-search">Cari Nama Karyawan</Label>
              <Input id="filter-search" type="text" value={search} onChange={(e) => updateFilter('search', e.target.value)} />
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
              {isEmployeesError && <p className="font-body text-xs text-status-rejected">Gagal memuat daftar karyawan.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-department">Departemen</Label>
              <Select
                id="filter-department"
                options={departmentOptions}
                disabled={isDepartmentsError}
                value={departmentId}
                onChange={(e) => updateFilter('department_id', e.target.value)}
              />
              {isDepartmentsError && <p className="font-body text-xs text-status-rejected">Gagal memuat daftar departemen.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTIONS]}
                value={status}
                onChange={(e) => updateFilter('status', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-month">Bulan</Label>
              <Select
                id="filter-month"
                options={[{ value: '', label: 'Semua Bulan' }, ...MONTH_OPTIONS]}
                value={month}
                onChange={(e) => updateFilter('month', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-year">Tahun</Label>
              <Select
                id="filter-year"
                options={[
                  { value: '', label: 'Semua Tahun' },
                  ...Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - i
                    return { value: String(y), label: String(y) }
                  }),
                ]}
                value={year}
                onChange={(e) => updateFilter('year', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-office-location">Cabang</Label>
              <Select
                id="filter-office-location"
                options={officeLocationOptions}
                disabled={isOfficeLocationsError}
                value={officeLocationId}
                onChange={(e) => updateFilter('office_location_id', e.target.value)}
              />
              {isOfficeLocationsError && <p className="font-body text-xs text-status-rejected">Gagal memuat daftar cabang.</p>}
            </div>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data slip gaji belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <Table<Payslip>
            isLoading={isLoading}
            data={rows}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada slip gaji untuk filter ini."
            pagination={
              data
                ? { page: data.pagination.current_page, totalPages: Math.max(1, data.pagination.last_page), onPageChange: (p) => updateFilter('page', String(p)) }
                : undefined
            }
            columns={[
              { key: 'employee_name', header: 'Nama Karyawan', render: (row) => row.employee?.full_name ?? '-' },
              { key: 'periode', header: 'Periode', render: (row) => formatMonthYear(row.month, row.year) },
              { key: 'net_salary', header: 'Gaji Bersih', align: 'right', mono: true, render: (row) => formatCurrency(row.net_salary) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'aksi',
                header: 'Aksi',
                render: (row) => (
                  <Button size="small" variant="ghost" onClick={() => openDetail(row.id)}>
                    Lihat Detail
                  </Button>
                ),
              },
            ]}
          />
        )}

        <PayslipDetailModal payslipId={detailId} onClose={closeDetail} showEmployeeName />
      </PermissionGate>
    </AppShell>
  )
}
