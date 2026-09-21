<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FAQRCode\Google2FA;

/**
 * Fitur 2FA (TOTP) - RFC 6238 standar, disetujui Bagus 2026-09-21.
 * Pakai PragmaRX\Google2FAQRCode\Google2FA langsung (instantiate manual,
 * BUKAN lewat facade/service-provider pragmarx/google2fa-laravel) -
 * package itu didesain buat alur login SESSION-based miliknya sendiri
 * (middleware, event, dst) yang gak relevan sama sekali di sini (auth
 * aplikasi ini 100% custom Bearer-token/Sanctum, dikonfirmasi Audit
 * Keamanan Tahap 1). Cuma dipakai murni sebagai library TOTP+QR code
 * standalone, alur 2-step login-nya custom ditulis sendiri di
 * AuthController/TwoFactorController.
 */
class TwoFactorService
{
    /**
     * Role wajib 2FA (keputusan eksplisit Bagus 2026-09-21) - pola
     * private const string array SAMA PERSIS
     * ApprovalWorkflowController::ALLOWED_APPROVER_ROLES, bukan enum
     * baru yang beda konvensi dari yang sudah dipakai project ini.
     * EMPLOYEE dan MANAGER SENGAJA TIDAK termasuk - di luar scope task
     * ini (lihat instruksi bagian F/H).
     */
    public const REQUIRED_ROLES = ['SUPER_ADMIN', 'HRD', 'FINANCE', 'DIRECTOR'];

    private const COMPANY_NAME = 'MyJAP Employee Portal';

    private const RECOVERY_CODE_COUNT = 8;

    private Google2FA $engine;

    public function __construct()
    {
        $this->engine = new Google2FA();
    }

    /**
     * Role employee ini termasuk 4 role wajib 2FA atau bukan - MURNI
     * cek role, TIDAK peduli kill switch (config('security.two_factor_enforced'))
     * sama sekali - itu tanggung jawab caller (AuthController) buat
     * digabung eksplisit, biar kill switch-nya kelihatan jelas di titik
     * pemakaian, bukan ketutup di dalam service.
     */
    public function isRoleRequired(Employee $employee): bool
    {
        return $employee->role && in_array($employee->role->role_code, self::REQUIRED_ROLES, true);
    }

    public function generateSecret(): string
    {
        return $this->engine->generateSecretKey();
    }

    /**
     * QR code sebagai data URI base64 - langsung dipasang ke <img
     * src="..."> di frontend, TANPA perlu endpoint gambar terpisah dan
     * TANPA perlu dangerouslySetInnerHTML (audit keamanan B.6 - 0
     * pemakaian dangerouslySetInnerHTML di seluruh app ini, sengaja gak
     * ditambah yang pertama di sini).
     *
     * Google2FAQrCode\Bacon::getQRCodeInline() balikin RAW markup SVG
     * (XML string polos, BUKAN data URI) selama Imagick extension gak
     * ada di server (SvgImageBackEnd jadi default) - dikonfirmasi baca
     * source-nya + test curl langsung, bukan asumsi dari nama method-nya.
     * Cuma otomatis jadi data:image/png;base64 KALAU Imagick kebetulan
     * ada - server produksi belum tentu punya extension itu, jadi
     * di-base64-encode manual di sini SENDIRI biar hasilnya konsisten
     * data URI apa pun kondisi server-nya, gak bergantung ke extension
     * opsional.
     *
     * "Holder" pakai email (unik, dikenali user) - "Company" nama app,
     * dua-duanya muncul di aplikasi authenticator user buat bedain akun
     * kalau mereka punya banyak entry.
     */
    public function getQrCodeInline(Employee $employee, string $secret): string
    {
        $raw = $this->engine->getQRCodeInline(self::COMPANY_NAME, $employee->email, $secret);

        if (str_starts_with($raw, 'data:')) {
            return $raw;
        }

        return 'data:image/svg+xml;base64,' . base64_encode($raw);
    }

    /**
     * Verifikasi kode 6 digit terhadap secret. Window default package
     * (null) dipakai apa adanya - toleransi standar RFC 6238 buat clock
     * drift wajar, TIDAK dilonggarkan/diperketat manual tanpa alasan.
     */
    public function verifyCode(string $secret, string $code): bool
    {
        return (bool) $this->engine->verifyKey($secret, $code);
    }

    /**
     * 8 kode plaintext acak (format XXXX-XXXX) - Str::random() Laravel
     * pakai random_bytes() di baliknya (cryptographically secure),
     * BUKAN mt_rand()/rand() biasa.
     */
    public function generateRecoveryCodes(): array
    {
        return array_map(
            fn () => Str::upper(Str::random(4)) . '-' . Str::upper(Str::random(4)),
            range(1, self::RECOVERY_CODE_COUNT)
        );
    }

    /**
     * HASH tiap kode (Hash::make(), sama mekanisme password) - SEBELUM
     * disimpan ke kolom yang encrypted cast juga (2 lapis, lihat
     * Employee::casts()). Plaintext-nya cuma pernah ada di response
     * TwoFactorController::confirm(), gak pernah disimpan di DB sama
     * sekali persis kayak plaintext password gak pernah disimpan.
     */
    public function hashRecoveryCodes(array $plainCodes): array
    {
        return array_map(fn (string $code) => Hash::make($code), $plainCodes);
    }

    /**
     * Cek kode recovery yang diinput user terhadap array hash tersimpan
     * - kalau cocok, kode itu LANGSUNG dicabut dari array (sekali pakai,
     * disimpan balik minus 1 kode) dan employee di-save. Balikin false
     * tanpa mengubah apapun kalau gak ada yang cocok.
     */
    public function verifyAndConsumeRecoveryCode(Employee $employee, string $submittedCode): bool
    {
        $hashedCodes = $employee->two_factor_recovery_codes ?? [];

        foreach ($hashedCodes as $index => $hashedCode) {
            if (Hash::check($submittedCode, $hashedCode)) {
                unset($hashedCodes[$index]);
                $employee->two_factor_recovery_codes = array_values($hashedCodes);
                $employee->save();

                return true;
            }
        }

        return false;
    }
}
