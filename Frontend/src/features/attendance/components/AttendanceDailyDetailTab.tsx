import { AlertTriangle } from 'lucide-react'
import { Table } from '../../../components/ui/Table'
import { formatDate } from '../../../lib/formatDate'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import type { Attendance } from '../../../api/types/attendance'

export const DAILY_DETAIL_PER_PAGE = 20

/** "HH:MM" dari datetime UTC backend, pola sama persis AttendanceHistoryPage.tsx (Task 9.5b). */
function formatTime(datetime: string | null): string {
  if (!datetime) return '-'
  const d = new Date(datetime.replace(' ', 'T') + 'Z')
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d)
}

interface AttendanceDailyDetailTabProps {
  /** SEMUA baris yang cocok filter (bukan 1 halaman server) - pagination dilakukan CLIENT-SIDE di komponen ini. */
  rows: Attendance[]
  isLoading: boolean
  isError: boolean
  page: number
  onPageChange: (page: number) => void
}

/**
 * Tab "Rincian Harian" (Task 10 Bagian B, tab default) - data mentah
 * PER BARIS absensi, terbaru dulu (backend sudah urutin attendance_date
 * DESC, lihat AttendanceController::index() - Task 9.5b). Pagination
 * CLIENT-SIDE (slice array `rows` yang SUDAH LENGKAP dari
 * useAttendanceMonitoring, bukan minta halaman baru ke server) - Table.tsx
 * gak tau bedanya, cuma butuh {page, totalPages, onPageChange} +
 * `data` = baris utk halaman itu doang.
 */
export function AttendanceDailyDetailTab({ rows, isLoading, isError, page, onPageChange }: AttendanceDailyDetailTabProps) {
  const totalPages = Math.max(1, Math.ceil(rows.length / DAILY_DETAIL_PER_PAGE))
  const displayPage = Math.min(Math.max(1, page), totalPages)
  const pageRows = rows.slice((displayPage - 1) * DAILY_DETAIL_PER_PAGE, displayPage * DAILY_DETAIL_PER_PAGE)

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
        <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
        <p className="font-body text-sm text-neutral-900">Data absensi belum dapat dimuat. Coba lagi.</p>
      </div>
    )
  }

  return (
    <Table<Attendance>
      isLoading={isLoading}
      data={pageRows}
      rowKey={(row) => row.id}
      emptyMessage="Belum ada data absensi untuk filter ini."
      pagination={{ page: displayPage, totalPages, onPageChange }}
      columns={[
        {
          key: 'attendance_date',
          header: 'Tanggal',
          render: (row) => formatDate(row.attendance_date),
        },
        {
          key: 'employee_name',
          header: 'Nama Karyawan',
          render: (row) => row.employee?.full_name ?? '-',
        },
        {
          key: 'office_location',
          header: 'Cabang',
          render: (row) => row.office_location?.office_name ?? '-',
        },
        {
          key: 'check_in',
          header: 'Jam Masuk',
          render: (row) => formatTime(row.check_in),
        },
        {
          key: 'check_out',
          header: 'Jam Pulang',
          render: (row) => formatTime(row.check_out),
        },
        {
          key: 'attendance_status',
          header: 'Status',
          render: (row) => <AttendanceStatusBadge status={row.attendance_status} />,
        },
        {
          key: 'notes',
          header: 'Catatan',
          render: (row) =>
            // is_valid_location TIDAK di-cast boolean di backend (0/1 mentah
            // dari DB) - cek pakai falsy (!row.is_valid_location), BUKAN
            // strict === false (dikonfirmasi investigasi Task 10).
            !row.is_valid_location ? (
              // role="img" WAJIB - <span> polos (role "generic") gak boleh
              // punya aria-label (axe rule aria-prohibited-attr), pola sama
              // persis AttendanceHistoryPage.tsx (Task 9.5b).
              <span
                role="img"
                title="Di luar radius kantor"
                aria-label="Di luar radius kantor"
                className="inline-flex shrink-0 text-status-pending"
              >
                <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
              </span>
            ) : null,
        },
      ]}
    />
  )
}
