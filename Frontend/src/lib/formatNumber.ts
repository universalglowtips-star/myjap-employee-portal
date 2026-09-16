/**
 * Task 15b - angka POLOS (bukan mata uang) buat sisi kuantitas breakdown
 * formula Slip Gaji ("Rp55.000 x 25 = Rp1.375.000"). maximumFractionDigits
 * 2 (bukan dipaksa 2 kayak formatCurrency) - quantity desimal:2 di DB
 * TEKNIS bisa pecahan (mis. 10.5 Hari Kerja), tapi kasus umum bulat -
 * "25" kebaca lebih jelas dari "25.00", tanpa kehilangan presisi kalau
 * memang ada pecahannya.
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(num)
}
