import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'

interface KpiCardProps {
  title: string
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  children: ReactNode
  /**
   * OPSIONAL (System Warnings, 2026-09-28) - kalau diisi, seluruh card
   * jadi <Link> yang navigasi ke path ini, BUKAN <div> polos. Default
   * undefined = perilaku PERSIS sebelum prop ini ada (card lain -
   * Karyawan Aktif/Cuti Pending/Payroll Bulan Ini - TIDAK ikut berubah
   * sama sekali, cuma card yang eksplisit dikasih `to` yang clickable).
   *
   * Pakai <Link> (react-router), BUKAN <div onClick>+role="button" -
   * dapat keyboard focus/aktivasi Enter/kanan-klik "buka tab baru" GRATIS
   * dari semantik anchor native, tanpa perlu tabIndex/onKeyDown manual.
   * Focus ring otomatis dari rule global `:focus-visible` di index.css,
   * gak perlu class tambahan.
   */
  to?: string
}

/**
 * Chrome loading/error SERAGAM buat tiap KPI card - per-komponen
 * (BUKAN 1 loading state buat seluruh halaman): 1 card yang query-nya
 * masih loading/gagal TIDAK menghalangi card lain yang datanya udah
 * siap buat tetap tampil normal.
 */
export function KpiCard({ title, isLoading, isError, errorMessage, children, to }: KpiCardProps) {
  const content = (
    <>
      <Label as="p">{title}</Label>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">{errorMessage ?? 'Gagal memuat data.'}</p>
        ) : (
          children
        )}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="block rounded-md bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        {content}
      </Link>
    )
  }

  return <Card>{content}</Card>
}
