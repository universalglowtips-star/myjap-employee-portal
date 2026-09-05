import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { Button } from '../../../components/ui/Button'
import { Toast } from '../../../components/ui/Toast'
import { useTodayAttendance } from '../hooks/useTodayAttendance'
import { AttendanceCheckModal } from './AttendanceCheckModal'

/** "HH:MM" dari datetime UTC backend ("YYYY-MM-DD HH:MM:SS"), ditampilkan di timezone lokal browser - append 'Z' biar Date object tau sumbernya UTC (konsisten konvensi UTC app.timezone). */
function formatTime(datetime: string | null): string {
  if (!datetime) return '-'
  const d = new Date(datetime.replace(' ', 'T') + 'Z')
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d)
}

/**
 * Card "Absensi Hari Ini" (Task 9.5 Bagian B.1). 3 state: belum absen
 * sama sekali (tombol Absen Masuk), sudah check-in belum check-out
 * (tombol Absen Pulang), sudah lengkap (ringkasan jam, tanpa tombol).
 */
export function AttendanceCard() {
  const { data: attendance, isLoading, isError } = useTodayAttendance()
  const [modalMode, setModalMode] = useState<'check-in' | 'check-out' | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const hasCheckedIn = !!attendance?.check_in
  const hasCheckedOut = !!attendance?.check_out

  return (
    <Card>
      <Label as="p">Absensi Hari Ini</Label>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
        ) : isError ? (
          <p className="font-body text-sm text-status-rejected">Gagal memuat data absensi.</p>
        ) : hasCheckedIn && hasCheckedOut && attendance ? (
          <div className="flex flex-col gap-1 font-body text-sm">
            <p className="text-neutral-900">
              Masuk <span className="font-semibold">{formatTime(attendance.check_in)}</span> - Pulang{' '}
              <span className="font-semibold">{formatTime(attendance.check_out)}</span>
            </p>
            <p className="text-neutral-600">Absensi hari ini sudah lengkap.</p>
          </div>
        ) : hasCheckedIn && attendance ? (
          <div className="flex flex-col gap-3">
            <p className="font-body text-sm text-neutral-900">
              Sudah absen masuk pukul <span className="font-semibold">{formatTime(attendance.check_in)}</span>.
            </p>
            <Button variant="primary" onClick={() => setModalMode('check-out')} className="self-start">
              Absen Pulang
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body text-sm text-neutral-600">Kamu belum absen hari ini.</p>
            <Button variant="primary" onClick={() => setModalMode('check-in')} className="self-start">
              Absen Masuk
            </Button>
          </div>
        )}
      </div>

      <AttendanceCheckModal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        mode={modalMode ?? 'check-in'}
        todayAttendance={attendance ?? null}
        onSuccess={(message) => {
          setModalMode(null)
          setToast({ variant: 'success', message })
        }}
        onError={(message) => {
          // Modal SENDIRI tetap kebuka (nampilin pesan inline + biarin
          // user coba lagi tanpa kehilangan foto/kantor yang udah
          // dipilih) - toast ini cuma buat visibility tambahan, pola
          // sama persis Toast sukses di atas (bukan pengganti).
          setToast({ variant: 'error', message })
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </Card>
  )
}
