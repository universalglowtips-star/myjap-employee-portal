import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Label } from '../../../components/ui/Label'
import { formatCurrency } from '../../../lib/formatCurrency'
import { formatMonthYear, MONTH_NAMES } from '../lib/payslipFormat'
import { usePayslips } from '../hooks/usePayslips'
import { PayslipDetailModal } from '../components/PayslipDetailModal'
import type { Payslip } from '../../../api/types/payslip'

const PER_PAGE = 10

const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }))

/**
 * Slip Gaji - view Karyawan (Task 12 Bagian C.2) - KHUSUS role TANPA
 * dashboard.view (EMPLOYEE). Percabangan permission ada di App.tsx
 * (PayslipRoute), sama persis pola AttendanceRoute/LeaveRoute
 * (Task 9.5b/10/11) - halaman ini gak perlu PermissionGate sendiri
 * karena cuma bisa "ketemu" lewat percabangan itu.
 *
 * employee_id TIDAK dikirim manual ke usePayslips() - ScopesOwnData +
 * restrictToPublishedIfEmployee di backend (PayslipController::index())
 * SELALU batasin ke slip Published milik sendiri kalau role EMPLOYEE,
 * apapun filter yang dikirim (dikonfirmasi investigasi Task 12, bukan
 * asumsi) - Draft milik sendiri pun TIDAK PERNAH kelihatan di sini,
 * jadi kolom Status gak perlu ditampilkan (selalu Published) dan pesan
 * kosong TIDAK BOLEH menyebut "ada slip Draft yang disembunyikan" -
 * karyawan gak seharusnya tau draft-nya sendiri sedang diproses HRD.
 */
export function PayslipEmployeePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailId, setDetailId] = useState<number | null>(null)

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const month = searchParams.get('month') ?? ''
  const year = searchParams.get('year') ?? ''

  const { data, isLoading, isError } = usePayslips({
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    per_page: PER_PAGE,
    page,
  })

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

  return (
    <AppShell title="Slip Gaji">
      <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-1/2">
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
          emptyMessage="Belum ada slip gaji yang diterbitkan."
          pagination={
            data
              ? { page: data.pagination.current_page, totalPages: Math.max(1, data.pagination.last_page), onPageChange: (p) => updateFilter('page', String(p)) }
              : undefined
          }
          columns={[
            { key: 'periode', header: 'Periode', render: (row) => formatMonthYear(row.month, row.year) },
            { key: 'net_salary', header: 'Gaji Bersih', align: 'right', mono: true, render: (row) => formatCurrency(row.net_salary) },
            {
              key: 'aksi',
              header: 'Aksi',
              render: (row) => (
                <Button size="small" variant="ghost" onClick={() => setDetailId(row.id)}>
                  Lihat Detail
                </Button>
              ),
            },
          ]}
        />
      )}

      <PayslipDetailModal payslipId={detailId} onClose={() => setDetailId(null)} showEmployeeName={false} />
    </AppShell>
  )
}
