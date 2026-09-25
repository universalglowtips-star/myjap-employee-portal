import { actionColorCategory, actionLabel, type ActionColorCategory } from '../lib/auditLogMappings'

interface ActionBadgeProps {
  action: string
}

/**
 * BUKAN reuse StatusBadge.tsx (components/ui/) - itu sengaja didesain
 * khusus 6 status workflow (Draft/Submitted/Approved/Published/
 * Rejected/Pending), alasan yang sama persis kayak kenapa Departemen/
 * Posisi juga gak maksa reuse StatusBadge buat is_active boolean
 * (lihat komentar di PositionListPage/DepartmentListPage). Action
 * audit log itu vocabulary yang beda total, jadi component beda.
 *
 * Teks polos + dot bg-current, BUKAN pill berlatar tinted
 * (bg-status-X/10) seperti versi lama - versi lama itu GAGAL axe
 * color-contrast, root cause yang sama persis sudah difix duluan di
 * StatusBadge.tsx (Task 11) & AttendanceStatusBadge.tsx; ActionBadge
 * ini yang terakhir ketinggalan. Markup-nya SENGAJA dibikin identik
 * sama AttendanceStatusBadge.tsx yang sudah lolos sweep (bukan pola
 * baru): token warna status di index.css SENGAJA digelapin supaya
 * lolos AA 4.5:1 terhadap latar PUTIH, bukan terhadap tint /10
 * miliknya sendiri - tint itu malah NURUNIN kontras, bukan naikin.
 *
 * Kontras ke-4 warna (dihitung ulang, bukan diasumsikan aman):
 * approved #2A7851 = 5.38:1, submitted #2563EB = 5.17:1,
 * rejected #C53030 = 5.47:1, neutral-600 #5C574C = 7.19:1 - semua
 * vs putih, semua lolos AA. Ke-4-nya tetap beda warna jelas satu
 * sama lain (hijau/biru/merah/abu), jadi kategori aksi masih bisa
 * dibedakan sekilas setelah tint-nya dibuang.
 *
 * TIDAK pakai text-success / text-primary-600: dua token itu sudah
 * tercatat gagal kontras di tempat lain. ActionBadge kebetulan
 * memang gak pernah pakai keduanya (dicek, bukan diasumsikan).
 */
const categoryClasses: Record<ActionColorCategory, string> = {
  green: 'text-status-approved',
  blue: 'text-status-submitted',
  red: 'text-status-rejected',
  gray: 'text-neutral-600',
}

export function ActionBadge({ action }: ActionBadgeProps) {
  const category = actionColorCategory(action)

  return (
    <span className={`inline-flex items-center gap-1.5 font-body text-xs font-medium ${categoryClasses[category]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {actionLabel(action)}
    </span>
  )
}
