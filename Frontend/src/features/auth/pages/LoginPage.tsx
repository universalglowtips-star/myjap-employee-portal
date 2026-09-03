import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import type { NormalizedApiError } from '../../../api/client'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'

/**
 * Validasi RINGAN - cuma pastikan field wajib terisi (sesuai instruksi
 * eksplisit). TIDAK menambahkan aturan format email/panjang password
 * dsb yang gak diminta - backend yang jadi otoritas soal itu (kalau
 * emailnya invalid, backend balikin 422, ditangani di onSubmit).
 */
const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  // Error 401 (gagal login) - pesan APA ADANYA dari backend, gak dikarang ulang.
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Toggle show/hide password - visual saja, tidak menyentuh cara value dikirim ke backend.
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setGeneralError(null)

    try {
      // SATU-SATUNYA pemanggilan auth logic - Login page gak pernah
      // manggil apiClient/login() endpoint langsung. Flow lengkap
      // (POST /login -> GET /me -> update state) ada di authStore,
      // bukan di sini.
      await login(values)

      // Redirect: balik ke route asal (disimpan ProtectedRoute lewat
      // location.state.from) kalau ada, fallback ke '/'.
      const from = (location.state as { from?: Location })?.from
      navigate(from?.pathname ?? '/', { replace: true })
    } catch (err) {
      const apiError = err as NormalizedApiError

      if (apiError.fieldErrors) {
        // 422 - petakan ke field yang sesuai. Cuma set field yang
        // backend beneran kirim errornya, gak menebak field lain.
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message: messages[0] })
          }
        }
      } else {
        // 401 atau error lain - tampilkan message backend apa adanya.
        setGeneralError(apiError.message)
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand Panel - 880/1600 dari frame Figma asli (55%), primary blue, teks brand */}
      <div className="hidden w-[55%] flex-col justify-center gap-5 bg-primary-600 px-24 lg:flex">
        <div className="self-start rounded-lg bg-white p-3 shadow-sm">
          <img src="/logo.png" alt="JAP Logistik" className="h-20 w-auto" />
        </div>
        <div className="h-1.5 w-16 rounded-full bg-accent-500" />
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-white">
          PT Jasa Angkutan
          <br />
          Publik Logistik
        </h1>
        <p className="font-body text-[15px] text-white">
          MyJAP Employee Portal — sistem HR, absensi, dan payroll terpadu untuk seluruh cabang
          Kalimantan Timur.
        </p>
      </div>

      {/* Form Panel - putih, form di-center */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-[45%]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-[400px] flex-col gap-6">
          <img src="/logo.png" alt="JAP Logistik" className="h-10 w-auto self-start lg:hidden" />

          <h2 className="font-display text-2xl font-semibold text-neutral-900">
            Masuk ke akun kamu
          </h2>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="nama@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">
              Kata Sandi
            </Label>
            {/* Toggle show/hide - lapisan visual di atas Input yang sudah ada, tidak mengubah Input.tsx (dipakai halaman lain juga) */}
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-[21px] -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
          </div>

          {generalError && (
            <p role="alert" className="font-body text-sm text-status-rejected">
              {generalError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Masuk
          </Button>
        </form>
      </div>
    </div>
  )
}
