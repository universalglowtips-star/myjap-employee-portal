import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { useDashboardSummary } from '../hooks/useDashboardSummary'

/** UTC-based (bukan timezone lokal browser) - konsisten sama pola computeOverrideStatus (Task 8d) dan app.timezone backend yang UTC. */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * SATU-SATUNYA card yang punya date picker sendiri - query-nya
 * (useDashboardSummary(selectedDate)) TERPISAH dari query 4 KPI card
 * lain di DashboardPage (yang manggil useDashboardSummary() tanpa
 * date sama sekali). Ganti tanggal di sini CUMA refetch instance
 * query ini - gak nyenggol cache/tampilan card lain, karena keduanya
 * punya query key berbeda (lihat comment di useDashboardSummary.ts).
 */
export function AttendanceTodayCard() {
  const [selectedDate, setSelectedDate] = useState(todayDateString)
  const { data, isLoading, isError } = useDashboardSummary(selectedDate)
  const attendance = data?.attendance_today

  return (
    <Card>
      <p className="font-body text-[13px] font-medium text-neutral-600">Kehadiran Hari Ini</p>

      <div className="mt-2 flex flex-col gap-1">
        <label htmlFor="attendance-today-date" className="font-body text-xs text-neutral-600">
          Tanggal
        </label>
        <input
          id="attendance-today-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full rounded-sm border border-neutral-200 px-2 py-1.5 font-body text-sm text-neutral-900 focus:outline-none focus:border-2 focus:border-primary-600"
        />
        <p className="font-body text-xs text-neutral-600">
          Tanggal ini cuma memengaruhi card ini - tidak memengaruhi card Payroll Bulan Ini.
        </p>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">Gagal memuat data kehadiran.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-body text-sm">
            <p>
              <span className="font-semibold text-status-approved">{attendance?.present ?? 0}</span>{' '}
              <span className="text-neutral-600">Hadir</span>
            </p>
            <p>
              <span className="font-semibold text-status-pending">{attendance?.late ?? 0}</span>{' '}
              <span className="text-neutral-600">Terlambat</span>
            </p>
            <p>
              <span className="font-semibold text-primary-600">{attendance?.on_leave ?? 0}</span>{' '}
              <span className="text-neutral-600">Cuti/Izin</span>
            </p>
            <p>
              <span className="font-semibold text-status-rejected">{attendance?.absent ?? 0}</span>{' '}
              <span className="text-neutral-600">Tidak Hadir</span>
            </p>
            <p className="col-span-2">
              <span className="font-semibold text-neutral-800">{attendance?.not_checked_in ?? 0}</span>{' '}
              <span className="text-neutral-600">Belum Absen</span>
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
