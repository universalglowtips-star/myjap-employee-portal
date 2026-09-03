import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Lock, AlertTriangle } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { formatDate } from '../../../lib/formatDate'
import { ActionBadge } from '../components/ActionBadge'
import { AuditLogDetailModal } from '../components/AuditLogDetailModal'
import { useAuditLogs } from '../hooks/useAuditLogs'
import { useEmployeesForFilter } from '../hooks/useEmployeesForFilter'
import { MODULE_LABELS, ACTION_LABELS, moduleLabel } from '../lib/auditLogMappings'
import type { AuditLog, AuditLogQueryParams } from '../../../api/types/auditLog'

const PER_PAGE = 20

/**
 * READ-ONLY sepenuhnya - gak ada create/update/delete di halaman ini
 * sama sekali (sesuai desain immutability backend, audit log gak
 * boleh diubah lewat jalur manapun). Gak ada ConfirmDialog/Toast buat
 * mutation karena emang gak ada mutation.
 *
 * Filter state DISIMPAN DI URL (useSearchParams, bukan cuma useState) -
 * key persis nama query param API (auditable_type, action, changed_by,
 * start_date, end_date, page), jadi refresh halaman gak kehilangan
 * filter, dan URL bisa langsung di-share/dites.
 */
export function AuditLogListPage() {
  const canView = usePermission('audit-log.view')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const auditableType = searchParams.get('auditable_type') ?? ''
  const action = searchParams.get('action') ?? ''
  const changedBy = searchParams.get('changed_by') ?? ''
  const startDate = searchParams.get('start_date') ?? ''
  const endDate = searchParams.get('end_date') ?? ''

  const queryParams: AuditLogQueryParams = {
    auditable_type: auditableType || undefined,
    action: action || undefined,
    changed_by: changedBy ? Number(changedBy) : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    per_page: PER_PAGE,
    page,
  }

  const { data, isLoading, isError, error } = useAuditLogs(queryParams, canView)
  const { data: employees, isLoading: isEmployeesLoading, isError: isEmployeesError } = useEmployeesForFilter()

  // Bentuk FUNGSIONAL setSearchParams (prev => next), BUKAN baca
  // `searchParams` dari closure luar - ini beda krusial, bukan cuma
  // gaya kode. Kalau 2 filter di-set beruntun cepat (mis. isi "Dari
  // Tanggal" lanjut "Sampai Tanggal" tanpa jeda render di antaranya -
  // kejadian nyata waktu ditest, dan bisa juga kejadian di device asli
  // yang lambat/user ngetik cepat), closure yang baca `searchParams`
  // versi LAMA bakal nimpa balik perubahan filter pertama yang belum
  // sempat ke-commit ke state. Fungsional updater selalu baca versi
  // TERBARU pas beneran dieksekusi, gak peduli seberapa cepat dipanggil beruntun.
  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      // Filter berubah -> balik ke halaman 1, hasil filter baru bisa aja lebih pendek dari halaman yang lagi dibuka sekarang.
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

  function resetFilters() {
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = !!(auditableType || action || changedBy || startDate || endDate)

  // "Semua ..." sebagai OPTION BENERAN (bukan lewat prop `placeholder`
  // Select.tsx) - placeholder Select.tsx dirender sebagai <option hidden>
  // yang gak bisa dipilih balik lewat UI setelah value lain kepilih
  // (lihat komentar di Select.tsx sendiri), padahal filter WAJIB bisa
  // di-reset ke "semua" kapan aja.
  const moduleOptions = [
    { value: '', label: 'Semua Modul' },
    ...Object.entries(MODULE_LABELS)
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id')),
  ]

  const actionOptions = [
    { value: '', label: 'Semua Aksi' },
    ...Object.entries(ACTION_LABELS)
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id')),
  ]

  const employeeOptions = [
    { value: '', label: 'Semua Karyawan' },
    ...(employees ?? []).map((e) => ({ value: String(e.id), label: e.full_name })),
  ]

  return (
    <AppShell title="Audit Log">
      <PermissionGate
        code="audit-log.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk melihat audit log.</p>
          </div>
        }
      >
        {/* Filter card terpisah di atas tabel (bukan nempel ke tabel) - sesuai Arahan Visual. */}
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-module">
                Modul
              </Label>
              <Select
                id="filter-module"
                options={moduleOptions}
                value={auditableType}
                onChange={(e) => updateFilter('auditable_type', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-action">
                Aksi
              </Label>
              <Select
                id="filter-action"
                options={actionOptions}
                value={action}
                onChange={(e) => updateFilter('action', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-changed-by">
                Dilakukan oleh
              </Label>
              <Select
                id="filter-changed-by"
                options={employeeOptions}
                disabled={isEmployeesLoading || isEmployeesError}
                value={changedBy}
                onChange={(e) => updateFilter('changed_by', e.target.value)}
              />
              {isEmployeesError && (
                <p className="font-body text-xs text-status-rejected">Gagal memuat daftar karyawan.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-start-date">
                Dari Tanggal
              </Label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => updateFilter('start_date', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-end-date">
                Sampai Tanggal
              </Label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => updateFilter('end_date', e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div>
              <Button variant="ghost" size="small" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          )}
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat audit log.'
                : 'Data audit log belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<AuditLog>
            isLoading={isLoading}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada data audit log."
            onRowClick={(row) => setSelectedLog(row)}
            pagination={
              data
                ? {
                    page: data.pagination.current_page,
                    totalPages: Math.max(1, data.pagination.last_page),
                    onPageChange: handlePageChange,
                  }
                : undefined
            }
            columns={[
              { key: 'created_at', header: 'Waktu', render: (row) => formatDate(row.created_at, true) },
              { key: 'module', header: 'Modul', render: (row) => moduleLabel(row.auditable_type) },
              { key: 'action', header: 'Aksi', render: (row) => <ActionBadge action={row.action} /> },
              {
                key: 'changed_by',
                header: 'Dilakukan oleh',
                render: (row) => row.changed_by?.full_name ?? 'Sistem',
              },
              { key: 'description', header: 'Deskripsi', render: (row) => row.description ?? '—' },
              {
                key: 'detail',
                header: '',
                align: 'right',
                render: (row) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedLog(row)
                    }}
                    aria-label="Lihat detail"
                    className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <Eye size={14} strokeWidth={2} />
                  </button>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      <AuditLogDetailModal open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </AppShell>
  )
}
