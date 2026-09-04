import { useEffect, useRef, useState } from 'react'
import { Camera, MapPin, AlertTriangle, RotateCcw } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Label } from '../../../components/ui/Label'
import { useAuthStore } from '../../../stores/authStore'
import { useAllowedOffices } from '../hooks/useAllowedOffices'
import { useCheckInAttendance, useCheckOutAttendance } from '../hooks/useAttendanceCheckMutations'
import { todayDateString } from '../hooks/useTodayAttendance'
import { determineAttendanceStatus } from '../lib/attendanceStatus'
import { distanceInMeters } from '../../../lib/geo'
import type { Attendance, AllowedOffice } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

interface AttendanceCheckModalProps {
  open: boolean
  onClose: () => void
  mode: 'check-in' | 'check-out'
  /** Wajib diisi untuk mode check-out (butuh id baris + office_location yang sudah dipilih pas check-in). Boleh null pas check-in (belum ada baris). */
  todayAttendance: Attendance | null
  onSuccess: (message: string) => void
}

type GeoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; latitude: number; longitude: number }
  | { status: 'error'; message: string }

type CameraState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'streaming' }
  | { status: 'captured'; photo: string }
  | { status: 'error'; message: string }

/**
 * Modal Absen Masuk/Pulang (Task 9.5 Bagian C) - GPS (auto-pilih
 * kantor terdekat + peringatan radius, non-blocking) + kamera (WAJIB
 * ambil foto sebelum submit aktif, validasi FRONTEND saja - backend
 * terima null) + dropdown kantor (cuma dari allowed-offices, khusus
 * mode check-in) + ConfirmDialog sebelum submit beneran.
 *
 * Mode check-out TIDAK fetch allowed-offices sama sekali - kantornya
 * FIXED dari office_location baris attendance hari ini yang sudah ada
 * (dipilih pas check-in, gak bisa diganti pas check-out).
 */
export function AttendanceCheckModal({ open, onClose, mode, todayAttendance, onSuccess }: AttendanceCheckModalProps) {
  const isCheckIn = mode === 'check-in'
  const employee = useAuthStore((s) => s.employee)

  const {
    data: allowedOffices,
    isLoading: isAllowedOfficesLoading,
    isError: isAllowedOfficesError,
  } = useAllowedOffices(open && isCheckIn)

  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [camera, setCamera] = useState<CameraState>({ status: 'idle' })
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const checkInMutation = useCheckInAttendance()
  const checkOutMutation = useCheckOutAttendance()
  const isSubmitting = isCheckIn ? checkInMutation.isPending : checkOutMutation.isPending

  const checkOutOffice = !isCheckIn && todayAttendance?.office_location ? todayAttendance.office_location : null

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeo({ status: 'error', message: 'Perangkat/browser ini tidak mendukung deteksi lokasi GPS.' })
      return
    }
    setGeo({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ status: 'success', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, lalu coba lagi.'
            : 'Gagal mendapatkan lokasi GPS. Pastikan GPS aktif, lalu coba lagi.'
        setGeo({ status: 'error', message })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function requestCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera({ status: 'error', message: 'Perangkat/browser ini tidak mendukung akses kamera.' })
      return
    }
    setCamera({ status: 'loading' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCamera({ status: 'streaming' })
    } catch (err) {
      const isPermissionDenied = err instanceof DOMException && err.name === 'NotAllowedError'
      setCamera({
        status: 'error',
        message: isPermissionDenied
          ? 'Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser, lalu coba lagi.'
          : 'Gagal mengakses kamera. Pastikan perangkat punya kamera yang berfungsi, lalu coba lagi.',
      })
    }
  }

  // Reset semua state internal + minta izin GPS/kamera tiap kali modal
  // dibuka - biar gak kebawa dari sesi sebelumnya (misal foto lama
  // nyangkut kalau user buka-tutup-buka modal lagi berkali-kali).
  useEffect(() => {
    if (!open) return
    setGeo({ status: 'idle' })
    setCamera({ status: 'idle' })
    setSelectedOfficeId(null)
    setConfirmOpen(false)
    setSubmitError(null)
    requestGeolocation()
    requestCamera()
    return () => {
      stopCameraStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // <video> baru muncul di DOM pas status 'streaming' - attach stream ke situ setiap kali status berubah jadi itu.
  useEffect(() => {
    if (camera.status === 'streaming' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [camera.status])

  // Auto-pilih kantor terdekat begitu allowedOffices + GPS dua-duanya siap (check-in aja - check-out kantornya fixed).
  useEffect(() => {
    if (!isCheckIn || selectedOfficeId !== null) return
    if (!allowedOffices || allowedOffices.length === 0) return

    if (geo.status === 'success') {
      let nearest = allowedOffices[0]
      let nearestDistance = distanceInMeters(geo.latitude, geo.longitude, Number(nearest.latitude), Number(nearest.longitude))
      for (const office of allowedOffices.slice(1)) {
        const d = distanceInMeters(geo.latitude, geo.longitude, Number(office.latitude), Number(office.longitude))
        if (d < nearestDistance) {
          nearest = office
          nearestDistance = d
        }
      }
      setSelectedOfficeId(nearest.id)
    } else if (geo.status === 'error') {
      // GPS gagal - gak bisa auto-pilih terdekat, default ke kantor
      // pertama di daftar biar dropdown gak kosong (user tetap bisa ganti manual).
      setSelectedOfficeId(allowedOffices[0].id)
    }
  }, [isCheckIn, allowedOffices, geo, selectedOfficeId])

  /** Foto absen cuma butuh cukup jelas buat verifikasi manual HRD, bukan resolusi penuh kamera - downscale ke maks 480px di sisi terpanjang sebelum di-encode base64, biar payload JSON yang dikirim ke POST/PUT tetap wajar (puluhan KB, bukan MB). Rasio aspek dipertahankan. */
  const MAX_PHOTO_DIMENSION = 480

  function handleCapturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(sourceWidth, sourceHeight))

    canvas.width = Math.round(sourceWidth * scale)
    canvas.height = Math.round(sourceHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const photo = canvas.toDataURL('image/jpeg', 0.8)
    stopCameraStream()
    setCamera({ status: 'captured', photo })
  }

  function handleRetakePhoto() {
    setCamera({ status: 'idle' })
    requestCamera()
  }

  const selectedOffice: AllowedOffice | null = isCheckIn
    ? (allowedOffices ?? []).find((o) => o.id === selectedOfficeId) ?? null
    : checkOutOffice
      ? {
          id: checkOutOffice.id,
          office_name: checkOutOffice.office_name,
          latitude: checkOutOffice.latitude,
          longitude: checkOutOffice.longitude,
          radius_meter: checkOutOffice.radius_meter,
        }
      : null

  const distance =
    geo.status === 'success' && selectedOffice
      ? distanceInMeters(geo.latitude, geo.longitude, Number(selectedOffice.latitude), Number(selectedOffice.longitude))
      : null

  const isOutsideRadius = distance !== null && selectedOffice !== null && distance > selectedOffice.radius_meter

  const hasPhoto = camera.status === 'captured'
  const canSubmit = hasPhoto && (isCheckIn ? selectedOfficeId !== null : true) && !isSubmitting

  async function handleConfirmSubmit() {
    setSubmitError(null)
    const photo = camera.status === 'captured' ? camera.photo : null
    const latitude = geo.status === 'success' ? geo.latitude : null
    const longitude = geo.status === 'success' ? geo.longitude : null
    // UTC "YYYY-MM-DD HH:MM:SS" - konsisten sama konvensi app.timezone backend (lihat todayDateString()).
    const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ')

    try {
      if (isCheckIn) {
        if (!selectedOfficeId) return
        const status = determineAttendanceStatus(new Date(), employee?.work_shift)
        await checkInMutation.mutateAsync({
          office_location_id: selectedOfficeId,
          attendance_date: todayDateString(),
          attendance_status: status,
          check_in: nowUtc,
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          check_in_photo: photo,
        })
        setConfirmOpen(false)
        onSuccess('Absen masuk berhasil dicatat.')
      } else {
        if (!todayAttendance) return
        await checkOutMutation.mutateAsync({
          id: todayAttendance.id,
          payload: {
            check_out: nowUtc,
            check_out_latitude: latitude,
            check_out_longitude: longitude,
            check_out_photo: photo,
          },
        })
        setConfirmOpen(false)
        onSuccess('Absen pulang berhasil dicatat.')
      }
    } catch (err) {
      const apiError = err as NormalizedApiError
      setSubmitError(apiError.message)
      setConfirmOpen(false)
    }
  }

  const title = isCheckIn ? 'Absen Masuk' : 'Absen Pulang'

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
              {title}
            </Button>
          </>
        }
      >
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          {isCheckIn && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="attendance-office">Lokasi Kantor</Label>
              {isAllowedOfficesLoading ? (
                <div className="h-10 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
              ) : isAllowedOfficesError ? (
                <p className="font-body text-sm text-status-rejected">Gagal memuat daftar kantor yang diizinkan.</p>
              ) : (allowedOffices ?? []).length === 0 ? (
                <p className="font-body text-sm text-status-rejected">
                  Tidak ada kantor yang diizinkan untuk absen. Hubungi HRD.
                </p>
              ) : (
                <Select
                  id="attendance-office"
                  value={selectedOfficeId !== null ? String(selectedOfficeId) : ''}
                  options={(allowedOffices ?? []).map((o) => ({ value: String(o.id), label: o.office_name }))}
                  onChange={(e) => setSelectedOfficeId(Number(e.target.value))}
                />
              )}
            </div>
          )}

          {!isCheckIn && checkOutOffice && (
            <div className="flex flex-col gap-1.5">
              <Label as="p">Lokasi Kantor</Label>
              <p className="font-body text-sm text-neutral-900">{checkOutOffice.office_name}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label as="p">Lokasi GPS</Label>
            {geo.status === 'loading' && (
              <p className="flex items-center gap-1.5 font-body text-sm text-neutral-600">
                <MapPin size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" /> Mendeteksi lokasi...
              </p>
            )}
            {geo.status === 'error' && (
              <div
                role="alert"
                className="flex items-start gap-1.5 rounded-sm border border-status-rejected/30 bg-status-rejected/10 p-2.5"
              >
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-status-rejected" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  {/* text-neutral-900 (BUKAN text-status-rejected) - ikon+border+bg tint tetap merah (murni dekoratif, gak kena rule color-contrast), tapi teks yang beneran dibaca WAJIB warna aman: text-status-rejected (#C53030) di atas bg-status-rejected/10 (#f2e2df) cuma 4.35:1, gagal AA (4.5:1) - pola yang PERSIS sama kayak root cause color-contrast Audit Log badge yang udah diketahui (lihat memory project_a11y_sweep). */}
                  <p className="font-body text-sm text-neutral-900">{geo.message}</p>
                  <button
                    type="button"
                    onClick={requestGeolocation}
                    className="self-start font-body text-sm font-medium text-primary-700 underline"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            )}
            {geo.status === 'success' && selectedOffice && distance !== null && (
              <div className="flex flex-col gap-1.5">
                <p className="font-body text-sm text-neutral-600">
                  Jarak ke {selectedOffice.office_name}: {Math.round(distance)} meter (radius diizinkan:{' '}
                  {selectedOffice.radius_meter}m)
                </p>
                {isOutsideRadius && (
                  <div
                    role="alert"
                    className="flex items-start gap-1.5 rounded-sm border border-status-pending/30 bg-status-pending/10 p-2.5"
                  >
                    <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-status-pending" aria-hidden="true" />
                    {/* text-neutral-900 (BUKAN text-status-pending) - dikonfirmasi LANGSUNG dari a11y sweep: text-status-pending (#dd6b20) di atas bg-status-pending/10 (#fcf0e9) cuma 3.02:1, gagal WCAG AA (4.5:1). Ikon+border+bg tint tetap kuning/oranye (dekoratif, gak kena rule color-contrast). */}
                    <p className="font-body text-sm text-neutral-900">
                      Kamu berada {Math.round(distance - selectedOffice.radius_meter)} meter di luar radius kantor ini.
                      Kamu tetap bisa absen, tapi lokasi ini akan tercatat di luar radius.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label as="p">Foto</Label>
            {camera.status === 'loading' && <p className="font-body text-sm text-neutral-600">Mengaktifkan kamera...</p>}
            {camera.status === 'error' && (
              <div
                role="alert"
                className="flex items-start gap-1.5 rounded-sm border border-status-rejected/30 bg-status-rejected/10 p-2.5"
              >
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-status-rejected" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  {/* text-neutral-900 - alasan sama persis banner GPS error di atas (text-status-rejected di atas bg-status-rejected/10 gagal WCAG AA). */}
                  <p className="font-body text-sm text-neutral-900">{camera.message}</p>
                  <button
                    type="button"
                    onClick={requestCamera}
                    className="self-start font-body text-sm font-medium text-primary-700 underline"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            )}
            {camera.status === 'streaming' && (
              <div className="flex flex-col gap-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Pratinjau kamera untuk foto absen"
                  className="w-full rounded-sm bg-neutral-900"
                />
                <Button type="button" variant="secondary" onClick={handleCapturePhoto} className="self-start">
                  <Camera size={16} strokeWidth={2} aria-hidden="true" /> Ambil Foto
                </Button>
              </div>
            )}
            {camera.status === 'captured' && (
              <div className="flex flex-col gap-2">
                <img src={camera.photo} alt="Foto absen yang sudah diambil" className="w-full rounded-sm" />
                <Button type="button" variant="ghost" size="small" onClick={handleRetakePhoto} className="self-start">
                  <RotateCcw size={14} strokeWidth={2} aria-hidden="true" /> Ambil Ulang
                </Button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          {submitError && (
            <p role="alert" className="font-body text-sm text-status-rejected">
              {submitError}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title={isCheckIn ? 'Konfirmasi Absen Masuk' : 'Konfirmasi Absen Pulang'}
        description={
          isCheckIn
            ? `Kamu akan absen masuk di ${selectedOffice?.office_name ?? '-'} pada ${new Date().toLocaleTimeString('id-ID')}. Data ini akan tercatat permanen sebagai kehadiran resmi. Lanjutkan?`
            : `Kamu akan absen pulang pada ${new Date().toLocaleTimeString('id-ID')}. Data ini akan tercatat permanen sebagai kehadiran resmi. Lanjutkan?`
        }
        confirmLabel={isCheckIn ? 'Ya, Absen Masuk' : 'Ya, Absen Pulang'}
        isConfirming={isSubmitting}
      />
    </>
  )
}
