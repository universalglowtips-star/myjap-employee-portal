import { Modal } from '../../../components/ui/Modal'
import { formatDate } from '../../../lib/formatDate'
import { cn } from '../../../lib/cn'
import { ActionBadge } from './ActionBadge'
import { moduleLabel } from '../lib/auditLogMappings'
import type { AuditLog } from '../../../api/types/auditLog'

interface AuditLogDetailModalProps {
  open: boolean
  onClose: () => void
  /** null aman - Modal.tsx sendiri return null kalau !open, tapi row bisa null sesaat (mis. abis di-clear) sebelum onClose kepanggil. */
  log: AuditLog | null
}

/** null/undefined -> '—', boolean -> Ya/Tidak, sisanya String() apa adanya - values di old/new_values bentuknya macem-macem tergantung modul (Department/Position/dst), gak ada 1 shape tetap. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}

export function AuditLogDetailModal({ open, onClose, log }: AuditLogDetailModalProps) {
  if (!log) return null

  const oldValues = log.old_values ?? {}
  const newValues = log.new_values ?? {}
  const hasOld = log.old_values !== null
  const hasNew = log.new_values !== null
  // Union key dari old+new - urutan gabungan (old dulu baru new punya
  // field lain), bukan diurutkan ulang - field yang gak berubah antar
  // modul biasanya tetap sama urutannya dari backend.
  const allKeys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]))

  return (
    <Modal open={open} onClose={onClose} title="Detail Audit Log">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-xs text-neutral-500">Waktu</span>
            <span className="font-body text-sm text-neutral-900">{formatDate(log.created_at, true)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-xs text-neutral-500">Modul</span>
            <span className="font-body text-sm text-neutral-900">{moduleLabel(log.auditable_type)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-xs text-neutral-500">Aksi</span>
            <ActionBadge action={log.action} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-xs text-neutral-500">Dilakukan oleh</span>
            <span className="font-body text-sm text-neutral-900">{log.changed_by?.full_name ?? 'Sistem'}</span>
          </div>
        </div>

        {log.description && (
          <p className="font-body text-sm text-neutral-600">{log.description}</p>
        )}

        {/* created: cuma new_values (belum ada "sebelum"). deleted: cuma
            old_values (udah gak ada "sesudah"). updated & lainnya: dua-duanya -
            kolom yang ditampilin nyesuain, BUKAN nampilin kolom kosong. */}
        {allKeys.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-body text-sm font-semibold text-neutral-900">Perubahan Data</h3>
            <div className="overflow-x-auto rounded-sm border border-neutral-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="px-3 py-1.5 text-left font-body text-xs font-medium text-neutral-500">Field</th>
                    {hasOld && <th className="px-3 py-1.5 text-left font-body text-xs font-medium text-neutral-500">Nilai Lama</th>}
                    {hasNew && <th className="px-3 py-1.5 text-left font-body text-xs font-medium text-neutral-500">Nilai Baru</th>}
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map((key) => {
                    const oldVal = oldValues[key]
                    const newVal = newValues[key]
                    // Highlight cuma kalau DUA-DUANYA ada (updated) dan beneran beda -
                    // created/deleted (cuma 1 sisi) gak pernah "berubah" secara definisi.
                    const changed = hasOld && hasNew && JSON.stringify(oldVal) !== JSON.stringify(newVal)
                    return (
                      <tr key={key} className={cn('border-t border-neutral-200', changed && 'bg-accent-300/15')}>
                        <td className="px-3 py-1.5 font-body text-xs font-medium text-neutral-600">{key}</td>
                        {hasOld && (
                          <td className="px-3 py-1.5 font-body text-sm text-neutral-900">{formatValue(oldVal)}</td>
                        )}
                        {hasNew && (
                          <td className="px-3 py-1.5 font-body text-sm text-neutral-900">{formatValue(newVal)}</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <h3 className="font-body text-sm font-semibold text-neutral-900">Metadata</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-neutral-500">Alamat IP</span>
              <span className="font-body text-sm text-neutral-900">{log.ip_address ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-neutral-500">Sumber</span>
              {log.source ? (
                <span className="inline-flex w-fit items-center rounded-sm bg-neutral-100 px-2 py-0.5 font-body text-xs font-medium text-neutral-600">
                  {log.source}
                </span>
              ) : (
                <span className="font-body text-sm text-neutral-900">—</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-xs text-neutral-500">User Agent</span>
            <span className="break-all font-body text-xs text-neutral-500">{log.user_agent ?? '—'}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
