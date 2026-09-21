import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { TwoFactorSetupFlow } from '../components/TwoFactorSetupFlow'

interface LocationState {
  setupToken?: string
}

/**
 * Alur PAKSA setup 2FA - satu-satunya jalan masuk buat employee role
 * wajib (SUPER_ADMIN/HRD/FINANCE/DIRECTOR) yang belum pernah confirm.
 * Dipanggil dari LoginPage lewat navigate(..., {state: {setupToken}}).
 * TIDAK ADA tombol "kembali ke login"/skip - keputusan eksplisit Bagus
 * (penegakan wajib, bukan opsional).
 *
 * Guard: akses langsung ke /2fa/setup tanpa lewat LoginPage (gak ada
 * setupToken di location.state, mis. reload halaman ini) -> redirect
 * ke /login, setup_token cuma valid 10 menit dan gak ke-persist
 * dimanapun (murni router state, hilang begitu di-reload).
 */
export function TwoFactorSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const completeLogin = useAuthStore((s) => s.completeLogin)

  const setupToken = (location.state as LocationState | null)?.setupToken

  useEffect(() => {
    if (!setupToken) {
      navigate('/login', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupToken])

  if (!setupToken) return null

  async function handleComplete(accessToken: string) {
    await completeLogin(accessToken)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[55%] flex-col justify-center gap-5 bg-primary-600 px-24 lg:flex">
        <div className="self-start rounded-lg bg-white p-3 shadow-sm">
          <img src="/logo.png" alt="JAP Logistik" className="h-20 w-auto" />
        </div>
        <div className="h-1.5 w-16 rounded-full bg-accent-500" />
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-white">
          Setup Autentikasi
          <br />
          Dua Faktor
        </h1>
        <p className="font-body text-[15px] text-white">
          Role kamu wajib mengaktifkan 2FA sebelum bisa masuk ke MyJAP Employee Portal - lapisan keamanan tambahan
          untuk melindungi data karyawan dan payroll perusahaan.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-10 lg:w-[45%]">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <img src="/logo.png" alt="JAP Logistik" className="h-10 w-auto self-start lg:hidden" />

          <h2 className="font-display text-2xl font-semibold text-neutral-900">Aktifkan 2FA</h2>

          <TwoFactorSetupFlow overrideToken={setupToken} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  )
}
