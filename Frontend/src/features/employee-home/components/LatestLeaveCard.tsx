import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { formatDate } from '../../../lib/formatDate'
import { useLatestLeave } from '../hooks/useLatestLeave'

/**
 * Card "Cuti Terakhir" (Task 9.5 Bagian B.2) - murni tampilan, TIDAK
 * ADA tombol ajukan cuti baru (Task 11). Label eksplisit "paling baru
 * diajukan" - GET /leaves?per_page=1 di backend order by created_at
 * desc, BUKAN sort by tanggal cuti terdekat.
 */
export function LatestLeaveCard() {
  const { data: leave, isLoading, isError } = useLatestLeave()

  return (
    <Card>
      <Label as="p">Cuti Terakhir</Label>
      <p className="mt-1 font-body text-xs text-neutral-600">Pengajuan yang paling baru diajukan, bukan yang tanggalnya paling dekat.</p>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">Gagal memuat data cuti.</p>
        ) : !leave ? (
          <p className="font-body text-sm text-neutral-600">Belum ada pengajuan cuti.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-body text-sm font-semibold text-neutral-900">{leave.leave_type}</p>
              <StatusBadge status={leave.status} />
            </div>
            <p className="font-body text-sm text-neutral-600">
              {formatDate(leave.start_date)} - {formatDate(leave.end_date)} ({leave.total_days} hari)
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
