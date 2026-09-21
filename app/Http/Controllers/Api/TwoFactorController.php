<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Fitur 2FA (TOTP) - dua endpoint ini dipakai dari DUA jalur:
 * 1. Paksa setup (login pertama role wajib, belum pernah confirm) -
 *    dipanggil pakai setup_token restricted dari AuthController::login().
 * 2. Sukarela (user sudah login normal, mau aktifkan dari halaman
 *    Keamanan Akun) - dipanggil pakai token normal biasa.
 * Endpoint-nya SAMA PERSIS buat dua-duanya (auth:sanctum generik) -
 * yang membedakan cuma abilities token, dicek EnforceTwoFactorTokenScope
 * (global middleware) buat setup_token, atau lolos bebas kalau token
 * normal ('*').
 */
class TwoFactorController extends Controller
{
    public function __construct(private TwoFactorService $twoFactor)
    {
    }

    /**
     * Generate secret TOTP baru (pending - two_factor_confirmed_at
     * TIDAK disentuh sampai /confirm sukses), balikin QR + secret text
     * (buat input manual kalau kamera gak bisa scan).
     */
    public function enable(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!$this->twoFactor->isRoleRequired($employee)) {
            return response()->json([
                'success' => false,
                'message' => '2FA belum tersedia untuk role ini.',
            ], 403);
        }

        $secret = $this->twoFactor->generateSecret();

        $employee->two_factor_secret = $secret;
        $employee->save();

        return response()->json([
            'success' => true,
            'message' => 'Scan QR code ini pakai aplikasi authenticator (Google Authenticator, Microsoft Authenticator, Authy, dll), lalu masukkan kode 6 digit untuk konfirmasi.',
            'data' => [
                'secret' => $secret,
                'qr_code' => $this->twoFactor->getQrCodeInline($employee, $secret),
            ],
        ]);
    }

    /**
     * Konfirmasi kode 6 digit pertama terhadap secret pending. Sukses:
     * set two_factor_confirmed_at, generate+simpan HASH 8 recovery
     * codes, balikin PLAINTEXT-nya SEKALI di response ini saja (gak
     * pernah disimpan/di-log plaintext, gak bisa diambil ulang setelah
     * ini). Token lama (setup_token ATAU token normal voluntary) selalu
     * dihapus lalu diganti token normal baru - pola sama persis
     * AuthController::login() (1 sesi aktif per akun), biar frontend
     * tinggal timpa authStore.token dengan yang baru dari response ini.
     */
    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|digits:6',
        ]);

        $employee = $request->user();

        if (!$employee->two_factor_secret) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada setup 2FA yang pending. Mulai dari /two-factor/enable dulu.',
            ], 422);
        }

        if (!$this->twoFactor->verifyCode($employee->two_factor_secret, $validated['code'])) {
            return response()->json([
                'success' => false,
                'message' => 'Kode 2FA tidak valid.',
            ], 422);
        }

        $plainRecoveryCodes = $this->twoFactor->generateRecoveryCodes();

        $employee->two_factor_recovery_codes = $this->twoFactor->hashRecoveryCodes($plainRecoveryCodes);
        $employee->two_factor_confirmed_at = now();
        $employee->save();

        AuditLogService::log(
            $employee,
            '2fa_confirmed',
            null,
            null,
            $employee->id,
            '2FA berhasil diaktifkan'
        );

        $employee->tokens()->delete();
        $token = $employee->createToken('authToken')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => '2FA berhasil diaktifkan. Simpan recovery codes ini sekarang - tidak akan ditampilkan lagi.',
            'data' => [
                'recovery_codes' => $plainRecoveryCodes,
                'access_token' => $token,
                'token_type' => 'Bearer',
                'employee' => $employee,
            ],
        ]);
    }
}
