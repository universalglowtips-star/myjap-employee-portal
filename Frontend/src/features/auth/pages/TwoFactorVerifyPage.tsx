import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { verifyTwoFactor } from '../../../api/endpoints/twoFactor'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import type { NormalizedApiError } from '../../../api/client'

interface LocationState {
  challengeToken?: string
  from?: { pathname: string }
}

interface CodeFormValues {
  code: string
}

interface RecoveryFormValues {
  recoveryCode: string
}

/**
 * Login step 2 - employee role wajib 2FA yang SUDAH confirmed. Dipanggil
 * dari LoginPage lewat navigate(..., {state: {challengeToken, from}}).
 * Toggle "pakai recovery code" - alternatif kalau HP/authenticator
 * hilang, TIDAK menggantikan kode 6 digit sebagai opsi utama.
 *
 * Guard sama persis TwoFactorSetupPage - gak ada challengeToken di
 * location.state -> redirect /login (challenge_token cuma 10 menit,
 * murni router state).
 */
export function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const completeLogin = useAuthStore((s) => s.completeLogin)

  const state = location.state as LocationState | null
  const challengeToken = state?.challengeToken

  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const codeForm = useForm<CodeFormValues>()
  const recoveryForm = useForm<RecoveryFormValues>()

  useEffect(() => {
    if (!challengeToken) {
      navigate('/login', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeToken])

  if (!challengeToken) return null

  async function handleVerify(payload: { code?: string; recovery_code?: string }) {
    setGeneralError(null)
    try {
      const data = await verifyTwoFactor({ challenge_token: challengeToken!, ...payload })
      await completeLogin(data.access_token)
      navigate(state?.from?.pathname ?? '/', { replace: true })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setGeneralError(apiError.message)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[55%] flex-col justify-center gap-5 bg-primary-600 px-24 lg:flex">
        <div className="self-start rounded-lg bg-white p-3 shadow-sm">
          <img src="/logo.png" alt="JAP Logistik" className="h-20 w-auto" />
        </div>
        <div className="h-1.5 w-16 rounded-full bg-accent-500" />
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-white">
          Verifikasi Dua
          <br />
          Faktor
        </h1>
        <p className="font-body text-[15px] text-white">
          Masukkan kode dari aplikasi authenticator kamu untuk menyelesaikan proses masuk.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-[45%]">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <img src="/logo.png" alt="JAP Logistik" className="h-10 w-auto self-start lg:hidden" />

          <h2 className="font-display text-2xl font-semibold text-neutral-900">Masukkan Kode 2FA</h2>

          {!useRecoveryCode ? (
            // key WAJIB beda dari form recovery code di bawah - dua-duanya
            // punya struktur JSX identik (form > div > Label + Input) di
            // posisi tree yang SAMA, react-hook-form register() itu
            // UNCONTROLLED (ref-based, gak ada `value=` yang dipegang
            // React) - tanpa key ini React RECONCILE elemen <input> lama
            // jadi "sama" pas toggle terjadi, DOM node fisiknya (beserta
            // value yang udah keketik user) kepakai ulang apa adanya,
            // cuma register() yang pindah binding - kode lama ("111111")
            // di field "Kode 6 Digit" jadi kebawa nongol di field
            // "Recovery Code" walau itu <input> yang "beda" secara JSX.
            // Ditemukan lewat screenshot verifikasi, BUKAN dugaan.
            <form
              key="code-form"
              onSubmit={codeForm.handleSubmit((v) => handleVerify({ code: v.code }))}
              noValidate
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Kode 6 Digit</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  autoFocus
                  error={codeForm.formState.errors.code?.message}
                  {...codeForm.register('code', {
                    required: 'Kode 2FA wajib diisi',
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    },
                  })}
                />
              </div>

              {generalError && (
                <p role="alert" className="font-body text-sm text-status-rejected">
                  {generalError}
                </p>
              )}

              <Button type="submit" loading={codeForm.formState.isSubmitting} className="w-full">
                Masuk
              </Button>

              <button
                type="button"
                onClick={() => {
                  setGeneralError(null)
                  setUseRecoveryCode(true)
                }}
                className="font-body text-sm text-primary-700 hover:underline focus:outline-none focus:underline"
              >
                Pakai recovery code
              </button>
            </form>
          ) : (
            <form
              key="recovery-form"
              onSubmit={recoveryForm.handleSubmit((v) => handleVerify({ recovery_code: v.recoveryCode }))}
              noValidate
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recoveryCode">Recovery Code</Label>
                <Input
                  id="recoveryCode"
                  type="text"
                  autoComplete="off"
                  placeholder="XXXX-XXXX"
                  autoFocus
                  error={recoveryForm.formState.errors.recoveryCode?.message}
                  {...recoveryForm.register('recoveryCode', { required: 'Recovery code wajib diisi' })}
                />
              </div>

              {generalError && (
                <p role="alert" className="font-body text-sm text-status-rejected">
                  {generalError}
                </p>
              )}

              <Button type="submit" loading={recoveryForm.formState.isSubmitting} className="w-full">
                Masuk
              </Button>

              <button
                type="button"
                onClick={() => {
                  setGeneralError(null)
                  setUseRecoveryCode(false)
                }}
                className="font-body text-sm text-primary-700 hover:underline focus:outline-none focus:underline"
              >
                Pakai kode 6 digit
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
