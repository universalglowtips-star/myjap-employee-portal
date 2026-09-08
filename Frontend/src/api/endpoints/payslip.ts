import { apiClient } from '../client'
import type { PayslipListResponse, PayslipQueryParams, PayslipDetailResponse } from '../types/payslip'

/** GET /payslips - restrictToPublishedIfEmployee + ScopesOwnData otomatis batasin EMPLOYEE ke slip Published miliknya sendiri (dikonfirmasi backend, bukan asumsi UI). */
export async function fetchPayslips(params: PayslipQueryParams): Promise<PayslipListResponse> {
  const res = await apiClient.get<PayslipListResponse>('/payslips', { params })
  return res.data
}

/** GET /payslips/{id} - restriksi sama persis fetchPayslips (ensureOwnDataOrAdmin + ensurePublishedOrAdmin) - EMPLOYEE akses slip Draft/orang lain balik 403. */
export async function fetchPayslip(id: number): Promise<PayslipDetailResponse['data']> {
  const res = await apiClient.get<PayslipDetailResponse>(`/payslips/${id}`)
  return res.data.data
}

/**
 * GET /payslips/{id}/pdf - binary response (bukan JSON), butuh
 * responseType 'blob'. TIDAK dipakai lewat <a href> polos - apiClient
 * nempelin Authorization Bearer token lewat interceptor, bukan cookie,
 * jadi navigasi link langsung ke URL ini bakal 401. Pola sama persis
 * downloadBlob di attendanceExport.ts (Task 10): fetch blob dulu, baru
 * trigger download lewat <a download> sementara + URL.createObjectURL.
 */
export async function downloadPayslipPdf(id: number, filenameFallback: string): Promise<void> {
  const res = await apiClient.get(`/payslips/${id}/pdf`, { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? filenameFallback

  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
