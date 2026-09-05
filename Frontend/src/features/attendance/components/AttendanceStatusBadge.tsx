import type { Attendance } from '../../../api/types/attendance'

type AttendanceStatus = Attendance['attendance_status']

/**
 * Vocabulary attendance_status (Present/Late/Leave/Sick/Permission/Absent)
 * BEDA TOTAL dari 6 status workflow StatusBadge.tsx (Draft/Submitted/
 * Approved/Published/Rejected/Pending) - BUKAN reuse component itu, pola
 * sama persis alasannya kayak ActionBadge.tsx (audit-log): vocabulary
 * beda, TAPI tetap pakai token warna status yang SUDAH aman kontras
 * (bukan warna baru) - 1:1 supaya 6 status dapat warna masing-masing
 * berbeda: Present->approved (hijau), Late->pending (kuning),
 * Leave->submitted (biru), Sick->published (teal), Permission->draft
 * (abu-abu), Absent->rejected (merah).
 *
 * SENGAJA teks polos (warna + titik), BUKAN pill berlatar tinted
 * (bg-status-X/10) kayak ActionBadge.tsx - dikonfirmasi lewat a11y sweep
 * (axe color-contrast): text-status-approved (#2A7851) SENGAJA
 * "didarkened" (lihat index.css) supaya lolos AA 4.5:1 persis terhadap
 * latar PUTIH, bukan terhadap tint hijau /10 miliknya sendiri (yang
 * malah NURUNIN kontras jadi 4.36, gagal ambang). Pola teks polos di
 * atas putih ini yang "SUDAH aman/terverifikasi" (instruksi tugas) -
 * sama persis kayak dipakainya di AttendanceTodayCard.tsx (Dashboard).
 */
const statusClasses: Record<AttendanceStatus, string> = {
  Present: 'text-status-approved',
  Late: 'text-status-pending',
  Leave: 'text-status-submitted',
  Sick: 'text-status-published',
  Permission: 'text-status-draft',
  Absent: 'text-status-rejected',
}

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-body text-xs font-medium ${statusClasses[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}
