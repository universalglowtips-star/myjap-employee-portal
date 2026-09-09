import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Table } from '../../../components/ui/Table'
import { Select } from '../../../components/ui/Select'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { usePayrollPeriods } from '../hooks/usePayrollPeriods'
import { useOfficeLocationsForFilter } from '../../attendance/hooks/useOfficeLocationsForFilter'
import { periodTypeLabel, formatPeriodRange } from '../lib/payrollPeriodFormat'
import { PERIOD_TYPE_OPTIONS } from '../../../api/types/payrollPeriod'
import type { PayrollPeriod } from '../../../api/types/payrollPeriod'

const PER_PAGE = 15

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Published', label: 'Published' },
]

/**
 * Periode Payroll - List (Task 13 Bagian C). Permission gate `dashboard.view`
 * (BUKAN payroll-period.view) - persis permission yang dipakai backend buat
 * GET /payroll-periods (dikonfirmasi routes/api.php, index/show sengaja
 * pakai dashboard.view karena ini view agregat lintas karyawan, beda dari
 * payroll-period.view yang cuma buat endpoint pendingMyApproval). TIDAK
 * ADA percabangan Route kayak AttendanceRoute/LeaveRoute - EMPLOYEE gak
 * punya permission apapun di modul ini sama sekali (dikonfirmasi
 * RolePermissionSeeder), jadi cuma satu halaman ini, PermissionGate di
 * dalam yang nolak EMPLOYEE (fallback "akses ditolak"), Sidebar juga gak
 * nampilin nav item ini buat EMPLOYEE.
 *
 * TIDAK ADA tombol Tambah/Edit/Hapus - PayrollPeriodController.php
 * SENGAJA gak punya route create/update/delete (dikonfirmasi
 * routes/api.php investigasi), periode cuma bisa dibuat otomatis lewat
 * findOrCreateRegular() (dipicu dari Task 15's generate-bulk).
 */
export function PayrollPeriodListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const periodType = searchParams.get('period_type') ?? ''
  const officeLocationId = searchParams.get('office_location_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const year = searchParams.get('year') ?? ''

  const { data, isLoading, isError } = usePayrollPeriods({
    period_type: periodType || undefined,
    office_location_id: officeLocationId ? Number(officeLocationId) : undefined,
    status: status || undefined,
    year: year ? Number(year) : undefined,
    per_page: PER_PAGE,
    page,
  })
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

  const officeLocationOptions = [
    { value: '', label: 'Semua Cabang' },
    ...(officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name })),
  ]

  return (
    <AppShell title="Periode Payroll">
      <PermissionGate
        code="dashboard.view"
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
              <Label htmlFor="filter-period-type">Jenis Periode</Label>
              <Select
                id="filter-period-type"
                options={[{ value: '', label: 'Semua Jenis' }, ...PERIOD_TYPE_OPTIONS]}
                value={periodType}
                onChange={(e) => updateFilter('period_type', e.target.value)}
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
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data periode payroll belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <Table<PayrollPeriod>
            isLoading={isLoading}
            data={rows}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada periode payroll untuk filter ini."
            pagination={
              data
                ? { page: data.pagination.current_page, totalPages: Math.max(1, data.pagination.last_page), onPageChange: (p) => updateFilter('page', String(p)) }
                : undefined
            }
            columns={[
              {
                key: 'period_code',
                header: 'Kode Periode',
                mono: true,
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => navigate(`/payroll/periods/${row.id}`)}
                    className="font-mono text-sm text-primary-700 hover:underline focus:outline-none focus:underline"
                  >
                    {row.period_code}
                  </button>
                ),
              },
              { key: 'period_type', header: 'Jenis', render: (row) => periodTypeLabel(row.period_type) },
              { key: 'office', header: 'Cabang', render: (row) => row.office_location?.office_name ?? 'Semua Cabang' },
              { key: 'periode', header: 'Periode', render: (row) => formatPeriodRange(row.period_start, row.period_end) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'payslips_count', header: 'Jumlah Payslip', align: 'right', mono: true, render: (row) => row.payslips_count ?? 0 },
            ]}
          />
        )}
      </PermissionGate>
    </AppShell>
  )
}
