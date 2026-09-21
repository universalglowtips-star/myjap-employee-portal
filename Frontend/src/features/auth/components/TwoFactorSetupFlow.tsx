import { useEffect, useState } from 'react'
import { Copy, Download, ShieldCheck } from 'lucide-react'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Toast } from '../../../components/ui/Toast'
import { enableTwoFactor, confirmTwoFactor } from '../../../api/endpoints/twoFactor'
import type { NormalizedApiError } from '../../../api/client'

interface TwoFactorSetupFlowProps {
  /** Diisi buat alur PAKSA (setup_token, authStore.token masih null). Kosong = sukarela, reuse token normal yang sudah login. */
  overrideToken?: string
  /** Dipanggil setelah recovery codes ditutup ("Lanjutkan") - bawa access_token hasil confirm() ke authStore.completeLogin(). */
  onComplete: (accessToken: string) => void | Promise<void>
}

type Step = 'loading' | 'error' | 'scan' | 'recovery-codes'

/**
 * Fitur 2FA - UI generate QR+secret -> input kode konfirmasi -> tampilkan
 * 8 recovery codes SEKALI. Dipakai dari 2 tempat (TwoFactorSetupPage
 * alur paksa, SecurityPage alur sukarela) - SATU komponen, bukan
 * diduplikasi, cuma beda `overrideToken`.
 *
 * TIDAK ADA tombol skip/"nanti aja" di step manapun - sesuai keputusan
 * eksplisit Bagus (penegakan wajib untuk alur paksa; alur sukarela
 * juga gak butuh skip karena munculnya section ini sendiri sudah
 * opt-in oleh user).
 */
export function TwoFactorSetupFlow({ overrideToken, onComplete }: TwoFactorSetupFlowProps) {
  const [step, setStep] = useState<Step>('loading')
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await enableTwoFactor(overrideToken)
        if (cancelled) return
        setSecret(data.secret)
        setQrCode(data.qr_code)
        setStep('scan')
      } catch (err) {
        if (cancelled) return
        const apiError = err as NormalizedApiError
        setLoadError(apiError.message)
        setStep('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConfirm() {
    setCodeError(undefined)
    setIsSubmitting(true)
    try {
      const data = await confirmTwoFactor(code, overrideToken)
      setRecoveryCodes(data.recovery_codes)
      setPendingAccessToken(data.access_token)
      setStep('recovery-codes')
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors?.code) {
        setCodeError(apiError.fieldErrors.code[0])
      } else {
        setCodeError(apiError.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setCopyToast({ variant: 'success', message: 'Recovery codes disalin ke clipboard.' })
    } catch {
      setCopyToast({ variant: 'error', message: 'Gagal menyalin. Coba download sebagai teks.' })
    }
  }

  function handleDownloadRecoveryCodes() {
    const blob = new Blob([recoveryCodes.join('\n') + '\n'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'myjap-2fa-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleFinish() {
    if (!pendingAccessToken) return
    await onComplete(pendingAccessToken)
  }

  if (step === 'loading') {
    return <p className="font-body text-sm text-neutral-600">Menyiapkan kode QR...</p>
  }

  if (step === 'error') {
    return <p role="alert" className="font-body text-sm text-status-rejected">{loadError}</p>
  }

  if (step === 'scan') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <img src={qrCode} alt="QR code setup 2FA" width={200} height={200} className="rounded-sm bg-white" />
          <div className="flex flex-col items-center gap-1">
            <p className="font-body text-xs text-neutral-600">Gak bisa scan? Masukkan kode ini secara manual:</p>
            <p className="font-mono text-sm font-medium tracking-wider text-neutral-900">{secret}</p>
          </div>
        </div>

        <p className="font-body text-sm text-neutral-600">
          Scan QR code di atas pakai aplikasi authenticator (Google Authenticator, Microsoft Authenticator, Authy, dll),
          lalu masukkan kode 6 digit yang muncul di sana untuk konfirmasi.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="two-factor-code">Kode 6 Digit</Label>
          <Input
            id="two-factor-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            error={codeError}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>

        {isSubmitting ? (
          <Button type="button" loading onClick={handleConfirm} className="w-full">
            Konfirmasi & Aktifkan 2FA
          </Button>
        ) : (
          <Button type="button" onClick={handleConfirm} disabled={code.length !== 6} className="w-full">
            Konfirmasi & Aktifkan 2FA
          </Button>
        )}
      </div>
    )
  }

  // step === 'recovery-codes'
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-status-approved">
        <ShieldCheck size={20} strokeWidth={2} />
        <p className="font-body text-sm font-medium">2FA berhasil diaktifkan</p>
      </div>

      <div className="rounded-md border border-status-pending bg-status-pending/5 p-4">
        <p className="font-body text-sm font-medium text-neutral-900">
          Simpan 8 recovery code ini sekarang - kode ini TIDAK akan ditampilkan lagi setelah halaman ini ditutup.
          Tiap kode cuma bisa dipakai sekali, buat masuk kalau HP/aplikasi authenticator kamu hilang.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-neutral-900">
          {recoveryCodes.map((rc) => (
            <span key={rc} className="rounded-sm bg-white px-2 py-1.5 text-center">
              {rc}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="small" onClick={handleCopyRecoveryCodes}>
            <Copy size={14} strokeWidth={2} />
            Salin
          </Button>
          <Button type="button" variant="secondary" size="small" onClick={handleDownloadRecoveryCodes}>
            <Download size={14} strokeWidth={2} />
            Download sebagai teks
          </Button>
        </div>
      </div>

      <Button type="button" onClick={handleFinish} className="w-full">
        Saya sudah simpan, lanjutkan
      </Button>

      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={copyToast.variant} message={copyToast.message} onDismiss={() => setCopyToast(null)} duration={4000} />
        </div>
      )}
    </div>
  )
}
