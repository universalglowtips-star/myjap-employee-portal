import tokens from './tokens.json'

export type StatusKey = keyof typeof tokens.semantic.status

/**
 * Satu-satunya sumber kebenaran visual project ini. Struktur ini
 * PERSIS mencerminkan 2 variable collection asli di Figma:
 * - `primitive` = collection "Primitives" (warna mentah, navy/blue/amber/status/neutral)
 * - `semantic`  = collection "Color" (yang BENERAN dipakai component -
 *   Button/Sidebar/dst binding ke sini, bukan ke primitive langsung)
 *
 * Redesign warna (primary jadi #0066FF, navy KHUSUS sidebar) sudah
 * dicerminkan di sini - primitive.navy TIDAK LAGI dipakai di
 * semantic.bg.primary (itu sekarang primitive.blue.600), navy CUMA
 * dipakai di semantic.bg.sidebar. Jangan reuse semantic.bg.primary
 * untuk elemen sidebar - pakai semantic.bg.sidebar eksplisit.
 *
 * React membaca lewat sini + lewat CSS variable di index.css untuk
 * utility Tailwind. Flutter nanti (Mobile APK) membaca tokens.json
 * yang sama untuk generate ThemeData - supaya warna, spacing, dan
 * tipografi PERSIS SAMA di Web dan Mobile tanpa kode yang dibagi.
 */
export { tokens }

/**
 * Mapping status backend -> warna. Key di sini SENGAJA persis sama
 * (lowercase) dengan nilai string status dari API (Draft, Submitted,
 * Approved, Published, Rejected, Pending, Cancelled - "cancelled"
 * ditambah Task 11 buat status Leave) - supaya StatusBadge tidak
 * perlu mapping manual yang bisa lupa di-update kalau ada status baru.
 *
 * Fallback SEKARANG neutral-600 (bukan neutral-400 lagi) - neutral-400
 * (#9C9689) TERBUKTI gagal kontras (2.72:1) sebagai teks polos di atas
 * bg-neutral-50 (ketemu pas status "Cancelled" jatuh ke fallback ini
 * karena belum ada key "cancelled" di tokens.semantic.status - sekarang
 * sudah ada, jadi fallback ini seharusnya gak pernah kepakai lagi buat
 * 7 status yang dikenal, tapi tetap dibenerin buat status future yang
 * belum dikenal juga aman kontrasnya, bukan diam-diam gagal lagi.
 */
export function statusColor(status: string): string {
  const key = status.toLowerCase() as StatusKey
  return tokens.semantic.status[key] ?? tokens.primitive.neutral['600']
}
