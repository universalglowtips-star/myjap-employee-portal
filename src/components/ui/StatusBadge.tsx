import { statusColor } from '../../design-system/tokens'

interface StatusBadgeProps {
  /** Persis nilai string status dari backend: Draft/Submitted/Approved/Published/Rejected/Pending - nama field ini SENGAJA gak diubah/dinormalisasi, biar bisa langsung dipasang dari response API tanpa mapping tambahan. */
  status: string
}

/**
 * Warna diambil dari statusColor() (design-system/tokens.ts, sudah
 * ada sejak Langkah 1) - TIDAK ada mapping warna baru dibuat di sini,
 * cuma reuse yang udah disinkronkan.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColor(status)

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium font-body"
      style={{ backgroundColor: `${color}24`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {status}
    </span>
  )
}
