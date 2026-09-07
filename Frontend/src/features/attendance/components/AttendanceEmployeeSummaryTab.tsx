import { AlertTriangle } from 'lucide-react'
import { Table } from '../../../components/ui/Table'
import type { EmployeeAttendanceSummary } from '../lib/attendanceAggregation'

interface AttendanceEmployeeSummaryTabProps {
  /** Hasil agregat (~200 baris maksimal, 1 per karyawan) - BUKAN data mentah, sudah dihitung di attendanceAggregation.ts sebelum sampai ke sini. */
  summary: EmployeeAttendanceSummary[]
  isLoading: boolean
  isError: boolean
  onEmployeeClick: (employeeId: number) => void
}

/**
 * Tab "Ringkasan per Karyawan" (Task 10 Bagian B) - TIDAK ADA
 * pagination di sini SENGAJA (beda dari Tab Rincian Harian) - jumlah
 * baris sudah dijamin maksimal ~200 (1 per karyawan) oleh
 * aggregateAttendanceByEmployee(), jauh di bawah skala yang butuh
 * pagination.
 *
 * Klik nama karyawan -> pindah ke Tab Rincian Harian dengan filter
 * Karyawan otomatis ke-set (instruksi eksplisit tugas) - cuma NAMA-nya
 * yang jadi target klik (button di dalam cell), BUKAN seluruh baris
 * (Table.tsx `onRowClick` sengaja TIDAK dipakai di sini), pola sama
 * persis nama karyawan clickable di EmployeeListPage.tsx.
 */
export function AttendanceEmployeeSummaryTab({ summary, isLoading, isError, onEmployeeClick }: AttendanceEmployeeSummaryTabProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
        <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
        <p className="font-body text-sm text-neutral-900">Data absensi belum dapat dimuat. Coba lagi.</p>
      </div>
    )
  }

  return (
    <Table<EmployeeAttendanceSummary>
      isLoading={isLoading}
      data={summary}
      rowKey={(row) => row.employee_id}
      emptyMessage="Belum ada data absensi untuk filter ini."
      columns={[
        {
          key: 'employee_name',
          header: 'Nama Karyawan',
          render: (row) => (
            <button
              type="button"
              onClick={() => onEmployeeClick(row.employee_id)}
              // text-primary-700 (BUKAN primary-600) - tabel ini duduk di
              // atas bg-neutral-50 (AppShell main), pola sama persis nama
              // karyawan clickable di EmployeeListPage.tsx.
              className="font-body text-sm text-primary-700 hover:underline focus:outline-none focus:underline"
            >
              {row.employee_name}
            </button>
          ),
        },
        {
          key: 'office_location_name',
          header: 'Cabang',
          render: (row) => row.office_location_name,
        },
        {
          key: 'present',
          header: 'Hadir',
          align: 'right',
          mono: true,
          render: (row) => row.present,
        },
        {
          key: 'late',
          header: 'Terlambat',
          align: 'right',
          mono: true,
          render: (row) => row.late,
        },
        {
          key: 'absent',
          header: 'Tidak Hadir',
          align: 'right',
          mono: true,
          render: (row) => row.absent,
        },
        {
          key: 'leaveOrPermission',
          header: 'Cuti/Izin',
          align: 'right',
          mono: true,
          render: (row) => row.leaveOrPermission,
        },
        {
          key: 'outsideRadius',
          header: 'Di Luar Radius',
          align: 'right',
          mono: true,
          render: (row) => row.outsideRadius,
        },
      ]}
    />
  )
}
