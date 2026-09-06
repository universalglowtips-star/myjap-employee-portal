import { useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { Table } from '../../../components/ui/Table'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { formatDate } from '../../../lib/formatDate'
import { useAttendanceHistory, todayDateString, minStartDateString } from '../hooks/useAttendanceHistory'
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge'
import type { Attendance } from '../../../api/types/attendance'

const PER_PAGE = 15

/** "HH:MM" dari datetime UTC backend ("YYYY-MM-DD HH:MM:SS"), ditampilkan di timezone lokal browser - pola sama persis AttendanceCard.tsx (Employee Home). */
function formatTime(datetime: string | null): string {
  if (!datetime) return '-'
  const d = new Date(datetime.replace(' ', 'T') + 'Z')
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d)
}

/**
 * Riwayat Absensi pribadi (Task 9.5b, Bagian B) - KHUSUS role TANPA
 * dashboard.view (EMPLOYEE). Percabangan permission ada di App.tsx
 * (AttendanceRoute), BUKAN di sini - halaman ini gak perlu PermissionGate
 * sendiri karena cuma bisa "ketemu" lewat percabangan itu.
 *
 * Rentang tanggal (Task 9.5b Bagian B) - default Dari=90 hari lalu,
 * Sampai=hari ini, user bisa ganti manual. Disimpan di URL search
 * params (pola sama persis AuditLogListPage.tsx: key `start_date`/
 * `end_date`, auto-refetch onChange TANPA tombol "Terapkan" - filter
 * date range yang SUDAH ADA di app ini (Audit Log) juga auto-apply,
 * bukan pakai tombol, jadi ngikutin pola yang sudah mapan). Diklem
 * (clamp) ke batas [minStartDateString(), todayDateString()] di
 * `updateDateFilter` sendiri, BUKAN cuma andalin atribut HTML
 * min/max - browser tertentu masih bisa nge-commit value manual di
 * luar batas itu ke onChange walau attribute-nya sudah dipasang.
 */
export function AttendanceHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const minStartDate = minStartDateString()
  const today = todayDateString()
  const startDate = searchParams.get('start_date') ?? minStartDate
  const endDate = searchParams.get('end_date') ?? today

  const { data, isLoading, isError } = useAttendanceHistory(startDate, endDate, page, PER_PAGE)

  function updateDateFilter(key: 'start_date' | 'end_date', rawValue: string) {
    const fallback = key === 'start_date' ? minStartDate : today
    let value = rawValue || fallback
    if (value < minStartDate) value = minStartDate
    if (value > today) value = today

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(key, value)
      // Rentang berubah -> balik ke halaman 1, hasil baru bisa aja lebih pendek dari halaman yang lagi dibuka sekarang.
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

  // Backend (AttendanceController::index()) yang urutin attendance_date
  // DESC - "terbaru dulu" (instruksi eksplisit tugas) beneran konsisten
  // LINTAS HALAMAN, bukan cuma di-re-sort per halaman doang.
  const rows = data?.data ?? []

  return (
    <AppShell title="Riwayat Absensi">
      <p className="mb-4 font-body text-sm text-neutral-600">
        Pilih rentang tanggal untuk melihat riwayat absensi (maksimal 90 hari terakhir).
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-1/2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-start-date">Dari Tanggal</Label>
            <Input
              id="filter-start-date"
              type="date"
              min={minStartDate}
              max={today}
              value={startDate}
              onChange={(e) => updateDateFilter('start_date', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-end-date">Sampai Tanggal</Label>
            <Input
              id="filter-end-date"
              type="date"
              min={minStartDate}
              max={today}
              value={endDate}
              onChange={(e) => updateDateFilter('end_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
          <p className="font-body text-sm text-neutral-900">Data riwayat absensi belum dapat dimuat. Coba lagi.</p>
        </div>
      ) : (
        <Table<Attendance>
          isLoading={isLoading}
          data={rows}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada riwayat absensi dalam 3 bulan terakhir"
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
            {
              key: 'attendance_date',
              header: 'Tanggal',
              render: (row) => formatDate(row.attendance_date),
            },
            {
              key: 'attendance_status',
              header: 'Status',
              render: (row) => <AttendanceStatusBadge status={row.attendance_status} />,
            },
            {
              key: 'jam',
              header: 'Jam Masuk - Jam Pulang',
              render: (row) => `${formatTime(row.check_in)} - ${formatTime(row.check_out)}`,
            },
            {
              key: 'office_location',
              header: 'Lokasi Kantor',
              render: (row) => (
                <span className="inline-flex items-center gap-1.5">
                  {row.office_location?.office_name ?? '-'}
                  {!row.is_valid_location && (
                    // role="img" WAJIB - <span> polos (role "generic") gak
                    // boleh punya aria-label (axe rule aria-prohibited-attr),
                    // role="img" bikin aria-label sah dipasang di sini.
                    <span
                      role="img"
                      title="Di luar radius kantor"
                      aria-label="Di luar radius kantor"
                      className="inline-flex shrink-0 text-status-pending"
                    >
                      <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
    </AppShell>
  )
}
