import type { ReactNode } from 'react'
import { Card } from '../../../components/ui/Card'

interface KpiCardProps {
  title: string
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  children: ReactNode
}

/**
 * Chrome loading/error SERAGAM buat tiap KPI card - per-komponen
 * (BUKAN 1 loading state buat seluruh halaman): 1 card yang query-nya
 * masih loading/gagal TIDAK menghalangi card lain yang datanya udah
 * siap buat tetap tampil normal.
 */
export function KpiCard({ title, isLoading, isError, errorMessage, children }: KpiCardProps) {
  return (
    <Card>
      <p className="font-body text-[13px] font-medium text-neutral-600">{title}</p>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">{errorMessage ?? 'Gagal memuat data.'}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
