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
 * audit log itu vocabulary yang beda total, jadi component beda,
 * TAPI pola visualnya (dot + tinted background) sengaja disamain
 * biar konsisten sama badge lain di app.
 */
const categoryClasses: Record<ActionColorCategory, string> = {
  green: 'bg-status-approved/10 text-status-approved',
  blue: 'bg-status-submitted/10 text-status-submitted',
  red: 'bg-status-rejected/10 text-status-rejected',
  gray: 'bg-neutral-100 text-neutral-600',
}

export function ActionBadge({ action }: ActionBadgeProps) {
  const category = actionColorCategory(action)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-body text-xs font-medium ${categoryClasses[category]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {actionLabel(action)}
    </span>
  )
}
