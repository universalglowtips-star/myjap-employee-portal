import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { formatCurrency } from '../../../lib/formatCurrency'
import { usePayslipsSummary } from '../hooks/usePayslipsSummary'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Card "Slip Gaji" (Task 9.5 Bagian B.3) - murni ringkasan, TIDAK ADA
 * link ke halaman daftar lengkap (Task 12, belum ada route-nya).
 * Data dari GET /payslips sudah otomatis kefilter Published-only +
 * milik sendiri di backend (restrictToPublishedIfEmployee +
 * ScopesOwnData).
 */
export function PayslipCard() {
  const { data, isLoading, isError } = usePayslipsSummary()
  const latest = data?.data[0]

  return (
    <Card>
      <Label as="p">Slip Gaji</Label>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">Gagal memuat data slip gaji.</p>
        ) : !latest || !data ? (
          <p className="font-body text-sm text-neutral-600">Belum ada slip gaji yang diterbitkan.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="font-body text-sm text-neutral-600">
              {MONTH_NAMES[latest.month - 1]} {latest.year}
            </p>
            <p className="font-display text-xl font-semibold text-neutral-900">{formatCurrency(latest.net_salary)}</p>
            <p className="font-body text-xs text-neutral-600">Total {data.total} slip sudah diterbitkan.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
