import { KpiCard } from '../../dashboard/components/KpiCard'
import { useLeaveQuota } from '../hooks/useLeaveQuota'

interface LeaveQuotaWidgetProps {
  /** Tanpa ini, backend default ke user yang login (widget di form pengajuan karyawan sendiri). */
  employeeId?: number
}

/**
 * Widget sisa kuota Annual Leave (Task 11 Bagian B) - reuse KpiCard.tsx
 * (Dashboard) apa adanya, BUKAN komponen baru - generik murni
 * (title/isLoading/isError/children), bukan spesifik-attendance/
 * spesifik-dashboard, jadi aman dipakai lintas fitur. text-neutral-900
 * (BUKAN text-primary-X) buat angka besar - pola sama persis KPI card
 * lain di Dashboard, aman dari jebakan kontras primary-600 di atas
 * bg-neutral-50 yang sudah pernah ketemu sebelumnya.
 */
export function LeaveQuotaWidget({ employeeId }: LeaveQuotaWidgetProps) {
  const { data: quota, isLoading, isError } = useLeaveQuota(employeeId)
  const year = quota?.year ?? new Date().getFullYear()

  return (
    <KpiCard title={`Sisa Kuota Cuti Tahunan (${year})`} isLoading={isLoading} isError={isError} errorMessage="Gagal memuat sisa kuota cuti.">
      <p className="font-display text-2xl font-semibold text-neutral-900">
        {quota?.remaining} <span className="font-body text-sm font-normal text-neutral-600">dari {quota?.quota} hari</span>
      </p>
      <p className="mt-1 font-body text-xs text-neutral-600">Berlaku untuk pengajuan Annual Leave saja, tidak berlaku untuk jenis cuti lain.</p>
    </KpiCard>
  )
}
