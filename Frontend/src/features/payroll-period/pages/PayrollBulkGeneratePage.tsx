import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { useOfficeLocations } from '../../master-data/hooks/useOfficeLocations'
import { useSalaryComponents } from '../../master-data/hooks/useSalaryComponents'
import { usePayrollPeriods } from '../hooks/usePayrollPeriods'
import { usePayrollPeriodActiveEmployees } from '../hooks/usePayrollPeriodActiveEmployees'
import { useGenerateBulkPayroll } from '../hooks/useBulkPayrollMutations'
import type { NormalizedApiError } from '../../../api/client'
import type { GenerateBulkMissingQuantitiesError } from '../../../api/types/payslip'

const MONTH_OPTIONS = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

/**
 * "Mulai Periode Baru" (gap Task 15b, menutup link mati "Proses Massal
 * Payroll") - satu-satunya entry point UI buat memicu generateBulk()
 * pertama kali untuk kombinasi bulan/tahun yang BELUM PERNAH ada
 * periode-nya sama sekali. Sebelum ini, satu-satunya tombol Generate
 * ada di Detail Periode (perlu periode-nya SUDAH ADA sebagai baris
 * buat dibuka) - sirkular buat kombinasi yang genuinely baru.
 *
 * Jenis Periode SENGAJA dikunci ke "Reguler" (bukan dropdown aktif) -
 * dikonfirmasi ke kode: generateBulk()/findOrCreateRegular() cuma
 * PERNAH bikin period_type='REGULAR', gak nerima parameter jenis
 * periode sama sekali. Nampilin dropdown THR/Bonus/dst di sini bakal
 * menyesatkan (kepilih tapi diam-diam diabaikan backend).
 *
 * generateBulk() BEKERJA GLOBAL per bulan/tahun (bukan per-cabang yang
 * dipilih) - resolve/bikin periode utk SEMUA cabang yang punya
 * karyawan aktif sekaligus (findOrCreateRegular() per cabang, lihat
 * PayslipController). Section "preview cabang" di bawah SENGAJA
 * ditampilkan SEBELUM tombol submit supaya ini gak jadi kejutan lagi,
 * sesuai insiden UAT Bagus (2026-09-17) - klik Generate dari 1 periode
 * lama diam-diam bikin 3 periode baru tanpa penjelasan apapun.
 *
 * Hasil generate (sukses/gagal-quantity) TIDAK ditampilkan di sini -
 * redirect ke /payroll/periods dengan query param, biar pesannya
 * PERSISTEN lewat reload/navigasi (React state toast/banner biasa
 * hilang begitu halaman di-reload, itu yang bikin insiden UAT
 * kemarin ambigu urutan kejadiannya).
 */
export function PayrollBulkGeneratePage() {
  const navigate = useNavigate()

  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const monthNum = Number(month)
  const yearNum = Number(year)
  const isValidCombo = month !== '' && year !== '' && monthNum >= 1 && monthNum <= 12 && Number.isInteger(yearNum) && yearNum >= 2024

  const { data: existingPeriodsData, isLoading: isLoadingExisting } = usePayrollPeriods({
    year: isValidCombo ? yearNum : undefined,
    per_page: 100,
  })
  const monthPrefix = isValidCombo ? `REGULAR-${yearNum}-${String(monthNum).padStart(2, '0')}` : null
  const existingForCombo = useMemo(
    () => (monthPrefix ? (existingPeriodsData?.data ?? []).filter((p) => p.period_code.startsWith(monthPrefix)) : []),
    [existingPeriodsData, monthPrefix]
  )
  const comboAlreadyExists = isValidCombo && !isLoadingExisting && existingForCombo.length > 0

  const { data: activeEmployees } = usePayrollPeriodActiveEmployees()
  const { data: officeLocations } = useOfficeLocations()
  const { data: salaryComponents } = useSalaryComponents()

  const distinctOfficeIds = useMemo(
    () => Array.from(new Set((activeEmployees ?? []).map((e) => e.office_location_id))),
    [activeEmployees]
  )
  const previewOffices = distinctOfficeIds.map((id) => officeLocations?.find((o) => o.id === id)?.office_name ?? `Cabang #${id}`)

  const hasActiveEmployees = (activeEmployees?.length ?? 0) > 0
  const hasGeneratableComponents = (salaryComponents ?? []).some((c) => (c.category === 'fixed' || c.category === 'scheduled_variable') && c.is_active)

  const readyToPreview = isValidCombo && !comboAlreadyExists && !isLoadingExisting
  const canSubmit = readyToPreview && hasActiveEmployees && hasGeneratableComponents

  const generateMutation = useGenerateBulkPayroll()

  async function handleSubmit() {
    setSubmitError(null)
    try {
      const result = await generateMutation.mutateAsync({ month: monthNum, year: yearNum })
      const periodsParam = result.periods.map((p) => `${p.id}:${p.period_code}`).join(',')
      navigate(
        `/payroll/periods?year=${yearNum}&bulk=success&created=${result.total_created}&skipped=${result.total_skipped}&periods=${encodeURIComponent(periodsParam)}`
      )
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.status === 422 && apiError.details && 'missing_quantities' in apiError.details) {
        const missing = (apiError.details as unknown as GenerateBulkMissingQuantitiesError).missing_quantities
        const uniquePeriods = new Map<number, string>()
        for (const m of missing) uniquePeriods.set(m.payroll_period_id, m.period_code)
        const periodsParam = Array.from(uniquePeriods.entries()).map(([id, code]) => `${id}:${code}`).join(',')
        navigate(
          `/payroll/periods?year=${yearNum}&bulk=missing&missing_count=${missing.length}&periods=${encodeURIComponent(periodsParam)}`
        )
      } else {
        // Gagal total, TIDAK ada periode/payslip yang kebuat - cukup
        // tampil di halaman ini sendiri, gak perlu redirect+state persisten.
        setSubmitError(apiError.message)
      }
    }
  }

  return (
    <AppShell
      title="Mulai Periode Baru"
      actions={
        <Button variant="ghost" onClick={() => navigate('/payroll/periods')}>
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali
        </Button>
      }
    >
      <PermissionGate
        code="payroll.generate-bulk"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk memulai periode payroll baru.</p>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Card>
            <Label as="p">Kombinasi Periode</Label>
            <p className="mt-1 font-body text-sm text-neutral-600">
              Pilih bulan &amp; tahun yang BELUM pernah ada periode payroll-nya. Ini akan memicu generate payroll massal
              pertama kali untuk kombinasi ini.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jenis-periode">Jenis Periode</Label>
                <Select id="jenis-periode" value="REGULAR" disabled options={[{ value: 'REGULAR', label: 'Reguler' }]} />
                <p className="font-body text-xs text-neutral-600">
                  Generate massal saat ini cuma mendukung periode Reguler bulanan. THR/Bonus/Off-Cycle/Koreksi belum
                  didukung lewat alur ini.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulan">Bulan</Label>
                <Select id="bulan" options={MONTH_OPTIONS} placeholder="Pilih Bulan" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tahun">Tahun</Label>
                <Input id="tahun" type="number" min={2024} inputMode="numeric" className="py-2" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
          </Card>

          {comboAlreadyExists && (
            <Card>
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-status-pending" />
                <div>
                  <p className="font-body text-sm font-medium text-neutral-900">
                    Periode untuk bulan ini sudah ada — gak bisa mulai generate baru dari sini.
                  </p>
                  <p className="mt-1 font-body text-sm text-neutral-600">Buka salah satu periode yang sudah ada buat lanjut isi Data Periode &amp; Generate:</p>
                  <ul className="mt-2 ml-5 list-disc font-body text-sm">
                    {existingForCombo.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/payroll/periods/${p.id}`)}
                          className="font-mono text-primary-700 hover:underline focus:outline-none focus:underline"
                        >
                          {p.period_code}
                        </button>{' '}
                        <span className="text-neutral-600">({p.office_location?.office_name ?? 'Semua Cabang'})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {readyToPreview && (
            <Card>
              <Label as="p">Preview</Label>
              {!hasActiveEmployees ? (
                <p className="mt-2 font-body text-sm text-status-rejected">Tidak ada karyawan aktif — generate akan gagal. Aktifkan minimal 1 karyawan dulu.</p>
              ) : !hasGeneratableComponents ? (
                <p className="mt-2 font-body text-sm text-status-rejected">
                  Belum ada komponen gaji kategori Tetap/Variabel Terjadwal yang aktif — generate akan gagal. Atur dulu di Komponen Gaji.
                </p>
              ) : (
                <p className="mt-2 font-body text-sm text-neutral-900">
                  Ini akan membuat periode untuk <b>{previewOffices.length} cabang</b>: {previewOffices.join(', ')}.
                  {' '}Kalau ada komponen Variabel Terjadwal yang berlaku tapi "Jumlah"-nya belum diisi, generate akan
                  gagal jelas (bukan diam-diam salah hitung) — kamu akan diarahkan ke periode yang perlu diisi dulu.
                </p>
              )}
            </Card>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-md border border-status-rejected bg-status-rejected/5 p-3">
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-status-rejected" />
              <p className="font-body text-sm text-neutral-900">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end">
            {/* loading harus literal true (Button.tsx Langkah 5), gak bisa
                digabung disabled - branch 2 cabang render, bukan pakai
                boolean generateMutation.isPending langsung ke prop loading. */}
            {generateMutation.isPending ? (
              <Button loading onClick={handleSubmit}>
                Mulai Generate
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Mulai Generate
              </Button>
            )}
          </div>
        </div>
      </PermissionGate>
    </AppShell>
  )
}
