import { ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { useAuthStore } from '../../../stores/authStore'
import { TwoFactorSetupFlow } from '../components/TwoFactorSetupFlow'

/**
 * Role wajib 2FA - SAMA PERSIS TwoFactorService::REQUIRED_ROLES backend.
 * Duplikasi list kecil ini (bukan fetch dari API) dianggap wajar - cuma
 * dipakai di SATU tempat ini buat keputusan tampilan, keputusan akses
 * SEBENARNYA tetap 100% di backend (403 kalau role gak cocok, halaman
 * ini murni ngikutin biar gak nampilin tombol yang bakal gagal).
 */
const REQUIRED_2FA_ROLES = ['SUPER_ADMIN', 'HRD', 'FINANCE', 'DIRECTOR']

/**
 * "Keamanan Akun" - alur SUKARELA (user sudah login normal). Untuk role
 * wajib 2FA yang belum confirmed: TwoFactorSetupFlow sama persis yang
 * dipakai alur paksa (TwoFactorSetupPage), cuma overrideToken dikosongkan
 * (reuse token normal dari authStore). Sudah confirmed: status read-only,
 * TIDAK ADA tombol nonaktifkan (sesuai desain - device hilang ditangani
 * SOP reset manual tinker, bukan self-service).
 */
export function SecurityPage() {
  const employee = useAuthStore((s) => s.employee)
  const completeLogin = useAuthStore((s) => s.completeLogin)

  const isRoleRequired = !!employee?.role && REQUIRED_2FA_ROLES.includes(employee.role.role_code)
  const isConfirmed = !!employee?.two_factor_confirmed_at

  async function handleComplete(accessToken: string) {
    await completeLogin(accessToken)
  }

  return (
    <AppShell title="Keamanan Akun">
      <Card className="max-w-xl">
        <Label as="p">Autentikasi Dua Faktor (2FA)</Label>
        <p className="mt-1 font-body text-sm text-neutral-600">
          Lapisan keamanan tambahan pakai aplikasi authenticator (Google Authenticator, Microsoft Authenticator, Authy,
          dll) - wajib untuk role SUPER_ADMIN/HRD/FINANCE/DIRECTOR.
        </p>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          {!isRoleRequired ? (
            <p className="font-body text-sm text-neutral-600">2FA belum tersedia untuk role kamu saat ini.</p>
          ) : isConfirmed ? (
            <div className="flex items-center gap-2 text-status-approved">
              <ShieldCheck size={18} strokeWidth={2} />
              <p className="font-body text-sm font-medium">2FA aktif sejak {employee?.two_factor_confirmed_at}</p>
            </div>
          ) : (
            <TwoFactorSetupFlow onComplete={handleComplete} />
          )}
        </div>
      </Card>
    </AppShell>
  )
}
