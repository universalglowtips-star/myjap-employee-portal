import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Lock, X } from 'lucide-react'
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

function parsePeriodsParam(raw: string | null): Array<{ id: number; code: string }> {
  if (!raw) return []
  return raw
    .split(',')
    .map((pair) => {
      const [idStr, ...codeParts] = pair.split(':')
      const id = Number(idStr)
      const code = codeParts.join(':')
      return Number.isFinite(id) && code ? { id, code } : null
    })
    .filter((v): v is { id: number; code: string } => v !== null)
}

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
 * TIDAK ADA tombol Tambah/Edit/Hapus langsung di halaman ini -
 * PayrollPeriodController.php SENGAJA gak punya route create/update/
 * delete (dikonfirmasi routes/api.php investigasi), periode cuma bisa
 * dibuat otomatis lewat findOrCreateRegular(). Entry point buat MULAI
 * periode baru ada di halaman terpisah '/payroll/bulk-process' (gap
 * Task 15b - "Mulai Periode Baru"), bukan CRUD form di sini.
 *
 * Banner hasil generate (success/missing) di bawah ini SENGAJA dibaca
 * dari query param URL (bulk/created/skipped/missing_count/periods),
 * BUKAN React state biasa - supaya pesannya PERSISTEN kalau halaman
 * di-reload atau dibuka ulang dari link lain, gak hilang kayak toast.
 * Ini nutup insiden UAT Bagus (2026-09-17): generate yang gagal
 * sebagian bikin 3 periode kosong tanpa pesan yang bertahan, jadi gak
 * jelas apa yang sebenarnya terjadi.
 */
export function PayrollPeriodListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const periodType = searchParams.get('period_type') ?? ''
  const officeLocationId = searchParams.get('office_location_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const year = searchParams.get('year') ?? ''

  const bulkResult = searchParams.get('bulk')
  const bulkCreated = searchParams.get('created')
  const bulkSkipped = searchParams.get('skipped')
  const bulkMissingCount = searchParams.get('missing_count')
  const bulkPeriods = useMemo(() => parsePeriodsParam(searchParams.get('periods')), [searchParams])

  function dismissBulkBanner() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('bulk')
      next.delete('created')
      next.delete('skipped')
      next.delete('missing_count')
      next.delete('periods')
      return next
    })
  }

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
        {bulkResult === 'success' && (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-status-published bg-status-published/5 p-4 shadow-sm">
            <CheckCircle2 size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-status-published" />
            <div className="flex-1">
              <p className="font-body text-sm font-medium text-neutral-900">
                Generate payroll berhasil — {bulkCreated ?? 0} payslip dibuat
                {bulkSkipped && Number(bulkSkipped) > 0 ? `, ${bulkSkipped} karyawan dilewati (sudah ada payslip)` : ''}.
              </p>
              {bulkPeriods.length > 0 && (
                <p className="mt-1.5 font-body text-sm text-neutral-600">
                  Periode yang terpengaruh:{' '}
                  {bulkPeriods.map((p, i) => (
                    <span key={p.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/payroll/periods/${p.id}`)}
                        className="font-mono text-primary-700 hover:underline focus:outline-none focus:underline"
                      >
                        {p.code}
                      </button>
                      {i < bulkPeriods.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <button type="button" onClick={dismissBulkBanner} aria-label="Tutup notifikasi" className="shrink-0 text-neutral-400 hover:text-neutral-600">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {bulkResult === 'missing' && (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-status-pending bg-status-pending/5 p-4 shadow-sm">
            <AlertTriangle size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-status-pending" />
            <div className="flex-1">
              <p className="font-body text-sm font-medium text-neutral-900">
                Generate payroll gagal sebagian — {bulkMissingCount ?? 0} data "Jumlah" komponen Variabel Terjadwal belum
                diisi.
              </p>
              <p className="mt-1 font-body text-sm text-neutral-600">
                Periode di bawah ini sudah terbuat, tapi payslip belum ter-generate. Buka periode-nya, isi Data Periode
                dulu, lalu Generate lagi dari halaman Detail:
              </p>
              {bulkPeriods.length > 0 && (
                <ul className="mt-2 ml-5 list-disc font-body text-sm">
                  {bulkPeriods.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/payroll/periods/${p.id}`)}
                        className="font-mono text-primary-700 hover:underline focus:outline-none focus:underline"
                      >
                        {p.code}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={dismissBulkBanner} aria-label="Tutup notifikasi" className="shrink-0 text-neutral-400 hover:text-neutral-600">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

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
