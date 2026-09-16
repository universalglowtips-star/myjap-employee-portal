import { apiClient } from '../client'
import type {
  PayslipListResponse,
  PayslipQueryParams,
  PayslipDetailResponse,
  UpdatePayslipRequest,
  GenerateBulkRequest,
  GenerateBulkResponse,
  PublishBulkRequest,
  PublishBulkResponse,
} from '../types/payslip'

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
/**
 * PUT /payslips/{id} - Task 15b, dipakai buat nambah item Situasional
 * (`items` = FULL REPLACE, lihat catatan di types/payslip.ts). Caller
 * WAJIB susun `items` dari hasil fetchPayslip() TERBARU + item baru,
 * bukan dari cache lama.
 */
export async function updatePayslip(id: number, payload: UpdatePayslipRequest) {
  const res = await apiClient.put<PayslipDetailResponse>(`/payslips/${id}`, payload)
  return res.data.data
}

/**
 * POST /payroll/generate-bulk - Task 15b, rewrite total logic
 * kategorisasi (fixed/scheduled_variable/situational). 422 spesial
 * (bukan NormalizedApiError.message biasa) kalau ada "Jumlah" yang
 * belum diisi - baca `err.details` (lihat client.ts) buat dapetin
 * `missing_quantities`/`total_missing` terstruktur.
 */
export async function generateBulkPayroll(payload: GenerateBulkRequest): Promise<GenerateBulkResponse> {
  const res = await apiClient.post<GenerateBulkResponse>('/payroll/generate-bulk', payload)
  return res.data
}

/** POST /payroll/publish-bulk - publish semua payslip Draft dalam periode (period_code = cara paling presisi, scope ke 1 periode aja). */
export async function publishBulkPayroll(payload: PublishBulkRequest): Promise<PublishBulkResponse> {
  const res = await apiClient.post<PublishBulkResponse>('/payroll/publish-bulk', payload)
  return res.data
}

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
