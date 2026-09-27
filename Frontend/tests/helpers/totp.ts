import { createGuardrails, generateSync } from 'otplib'

/**
 * Generator kode TOTP buat login otomatis akun QA yang kena wajib 2FA
 * (SUPER_ADMIN/HRD/FINANCE/DIRECTOR - lihat TwoFactorService::REQUIRED_ROLES).
 *
 * Yang disimpan di .env.test.local SECRET-nya (permanen), bukan kode 6
 * digitnya - kode itu cuma valid 1 window 30 detik, jadi HARUS
 * di-generate ulang tiap kali dipakai, bukan di-hardcode.
 *
 * SENGAJA generate di Node (otplib), BUKAN shell-out ke
 * `php artisan tinker` yang juga bisa ngitung kode yang sama:
 * boot artisan di mesin dev ini makan ~8-15 detik per panggilan dan
 * nambah beban ke php dev server yang gampang wedged, sementara sweep
 * butuh kode ini beberapa kali per run.
 *
 * MIN_SECRET_BYTES: 10 WAJIB di-relax. Default guardrail otplib v13
 * minta >=16 byte (128 bit), sedangkan secret dari
 * Google2FA::generateSecretKey() (dipakai backend) itu 16 karakter
 * base32 = 10 byte, jadi kalau guardrail-nya dibiarkan default,
 * generateSync() nolak secret produksi kita sendiri dengan
 * "Secret must be at least 16 bytes". Ini murni batasan pustaka di
 * sisi test, BUKAN indikasi secret backend-nya salah/lemah menurut
 * RFC 6238 (16 char base32 itu panjang standar Google Authenticator).
 *
 * Kompatibilitas otplib <-> Google2FA backend TIDAK diasumsikan -
 * sudah dibuktikan end-to-end: kode hasil generateSync() dikirim ke
 * POST /api/login/verify-2fa asli dan diterima ("Login berhasil.").
 */
const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 })

/** Nama env var-nya dipakai di beberapa tempat - taruh sekali di sini. */
export const QA_SWEEP_TOTP_SECRET_ENV = 'QA_SWEEP_TOTP_SECRET'

export function generateTotp(secret: string): string {
  return generateSync({ secret, guardrails })
}

/**
 * Kode TOTP akun QA a11y sweep. Sengaja throw dengan pesan yang
 * ngejelasin langkah perbaikannya (bukan cuma "undefined") - kalau
 * secret-nya belum diisi, sweep bakal gagal di tengah alur login dan
 * penyebabnya gak kelihatan sama sekali dari error Playwright biasa.
 */
export function qaSweepTotp(): string {
  const secret = process.env[QA_SWEEP_TOTP_SECRET_ENV]

  if (!secret) {
    throw new Error(
      `${QA_SWEEP_TOTP_SECRET_ENV} belum di-set. Salin Frontend/.env.test.example ke ` +
        'Frontend/.env.test.local lalu isi secret TOTP akun qa-a11y-sweep (lihat komentar di file itu).'
    )
  }

  return generateTotp(secret)
}
