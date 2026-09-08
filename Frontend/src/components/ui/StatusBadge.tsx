import { statusColor } from '../../design-system/tokens'

interface StatusBadgeProps {
  /** Persis nilai string status dari backend: Draft/Submitted/Approved/Published/Rejected/Pending - nama field ini SENGAJA gak diubah/dinormalisasi, biar bisa langsung dipasang dari response API tanpa mapping tambahan. */
  status: string
}

/**
 * Warna diambil dari statusColor() (design-system/tokens.ts, sudah
 * ada sejak Langkah 1) - TIDAK ada mapping warna baru dibuat di sini,
 * cuma reuse yang udah disinkronkan.
 *
 * Teks polos + dot (bg-current), BUKAN pill berlatar tinted
 * (backgroundColor: `${color}24`) seperti versi lama - pola lama
 * gagal axe color-contrast (root cause yang sama persis dengan
 * ActionBadge.tsx/Audit Log yang masih di-defer): warna token status
 * SENGAJA didarkened supaya lolos AA 4.5:1 terhadap latar PUTIH, bukan
 * terhadap tint /~14% opacity miliknya sendiri (kontras malah turun,
 * bukan naik). Fix ini menyamakan pola dengan AttendanceStatusBadge.tsx
 * yang sudah lolos sweep - dipakai di atas Card.tsx (bg-white), jadi
 * kontras yang sama terverifikasi tetap berlaku di sini.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColor(status)

  return (
    <span className="inline-flex items-center gap-1.5 font-body text-xs font-medium" style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {status}
    </span>
  )
}
