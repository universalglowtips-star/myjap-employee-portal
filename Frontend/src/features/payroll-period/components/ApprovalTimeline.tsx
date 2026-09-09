import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { formatDate } from '../../../lib/formatDate'
import type { PayrollPeriod, PayrollPeriodSummary } from '../../../api/types/payrollPeriod'

interface ApprovalTimelineProps {
  period: PayrollPeriod
  approvalHistoryByCycle: PayrollPeriodSummary['approval_history_by_cycle']
}

/**
 * Konsumsi read-only approval_workflows/approval_workflow_steps + riwayat
 * payroll_approvals - TIDAK ADA create/edit/delete step di sini sama
 * sekali (itu Task 14, permission approval-workflow.*, di luar scope
 * Task 13 - dikonfirmasi eksplisit di investigasi).
 *
 * 2 bagian: (1) daftar level workflow yang dikonfigurasi (steps), level
 * yang lagi Pending SEKARANG (current_approval_level) ditandai jelas -
 * biar user tau giliran siapa TANPA UI harus tebak-tebakan role user
 * sendiri (approve/reject button tetap muncul buat siapapun yang punya
 * permission-nya, backend yang final-enforce giliran via
 * resolveCurrentPendingApproval() - pola sama LeaveAdminPage, frontend
 * gak duplikasi logic otorisasi backend). (2) riwayat LENGKAP dikelompokkan
 * per submission_cycle (cycle baru = resubmit setelah reject sebelumnya,
 * cycle lama TETAP tersimpan sebagai jejak audit, gak pernah ketimpa).
 */
export function ApprovalTimeline({ period, approvalHistoryByCycle }: ApprovalTimelineProps) {
  const steps = period.approval_workflow?.steps ?? []
  const cycles = Object.keys(approvalHistoryByCycle).sort((a, b) => Number(a) - Number(b))

  return (
    <Card>
      <Label as="p">Alur Approval</Label>

      {!period.approval_workflow_id ? (
        <p className="mt-2 font-body text-sm text-neutral-600">
          Periode ini belum pernah disubmit, jadi belum ada workflow approval yang terpasang.
        </p>
      ) : steps.length === 0 ? (
        <p className="mt-2 font-body text-sm text-neutral-600">Workflow approval periode ini tidak terkonfigurasi.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((step) => {
            const isCurrent = period.status === 'Submitted' && period.current_approval_level === step.level
            return (
              <div
                key={step.id}
                className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 ${
                  isCurrent ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'
                }`}
              >
                <span className="font-body text-xs text-neutral-500">Level {step.level}</span>
                <span className="font-body text-sm font-medium text-neutral-900">
                  {step.approver_role?.role_name ?? step.approver_role?.role_code ?? `Role #${step.approver_role_id}`}
                </span>
                {/* text-primary-700 (BUKAN primary-600 default) - span ini duduk di atas bg-primary-50
                    (tint terang), BUKAN putih murni. primary-600 di atas primary-50 cuma 4.21:1, GAGAL AA
                    (dikonfirmasi axe langsung, dihitung manual: #0066FF/#E6F0FF). primary-700 (#0052CC) di
                    kombinasi sama = 5.94:1, lolos. Pola sama persis fix SidebarNavItem/EmployeeListPage
                    sebelumnya untuk teks di atas latar non-putih. */}
                {isCurrent && <span className="font-body text-xs font-medium text-primary-700">Sedang menunggu approval</span>}
                {step.restrict_to_office_location && (
                  <span className="font-body text-xs text-neutral-500">Dibatasi per cabang</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {cycles.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {cycles.map((cycle) => {
            const rows = approvalHistoryByCycle[cycle]
            const isCurrentCycle = Number(cycle) === period.submission_cycle
            return (
              <div key={cycle}>
                <p className="font-body text-xs font-medium text-neutral-500">
                  Percobaan submit ke-{cycle}
                  {isCurrentCycle ? ' (sekarang)' : ''}
                </p>
                <div className="mt-1.5 overflow-x-auto">
                  <table className="w-full min-w-[480px] font-body text-sm">
                    <tbody>
                      {rows.map((approval) => (
                        <tr key={approval.id} className="border-b border-neutral-100 last:border-0">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-neutral-600">Level {approval.level}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-neutral-900">
                            {approval.approver_role?.role_name ?? approval.approver_role?.role_code ?? '-'}
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            <StatusBadge status={approval.status} />
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-neutral-600">{approval.actor?.full_name ?? '-'}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-neutral-600">{formatDate(approval.acted_at, true)}</td>
                          <td className="py-1.5 text-neutral-600">{approval.notes ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
