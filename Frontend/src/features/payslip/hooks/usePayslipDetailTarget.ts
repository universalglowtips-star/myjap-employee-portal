import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * State PayslipDetailModal (`payslipId`) + dukungan deep link
 * `?payslip_id=N`. Dipakai PayslipEmployeePage DAN PayslipAdminPage -
 * satu hook, bukan logic yang sama disalin 2x (dua halaman itu beda
 * UI tapi perilaku modal detail-nya identik).
 *
 * Deep link-nya dipakai notifikasi: klik notifikasi payslip_published/
 * payslip_unpublished ngarah ke '/payroll/payslips?payslip_id=N' biar
 * user langsung lihat slip yang dimaksud, bukan mendarat di list mentah
 * lalu harus nyari sendiri.
 *
 * useEffect (BUKAN cuma useState initializer) - kalau user udah di
 * halaman ini lalu klik notifikasi payslip LAIN dari dropdown bell,
 * route-nya sama jadi komponen TIDAK remount; initializer gak akan
 * jalan lagi dan modal-nya bakal nunjuk slip yang salah/gak kebuka.
 *
 * Param dibersihin pas modal ditutup (replace: true - gak nambah entri
 * history baru, tombol Back tetap balik ke halaman sebelumnya bukan ke
 * modal yang sama kebuka lagi). Tanpa ini, param nyangkut di URL dan
 * modal kebuka terus tiap kali user nutup.
 */
export function usePayslipDetailTarget() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailId, setDetailId] = useState<number | null>(null)

  const deepLinkId = Number(searchParams.get('payslip_id')) || null

  useEffect(() => {
    if (deepLinkId) setDetailId(deepLinkId)
  }, [deepLinkId])

  function closeDetail() {
    setDetailId(null)

    if (searchParams.has('payslip_id')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('payslip_id')
          return next
        },
        { replace: true }
      )
    }
  }

  return { detailId, openDetail: setDetailId, closeDetail }
}
