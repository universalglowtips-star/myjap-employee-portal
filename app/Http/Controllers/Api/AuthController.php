<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Services\AuditLogService;
use App\Services\TwoFactorService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(private TwoFactorService $twoFactor)
    {
    }

    /**
     * Login. Alur TIDAK BERUBAH SAMA SEKALI untuk role yang bukan
     * SUPER_ADMIN/HRD/FINANCE/DIRECTOR (TwoFactorService::REQUIRED_ROLES)
     * ATAU kalau kill switch config('security.two_factor_enforced')
     * mati - langsung issue token normal, response shape persis sama
     * kayak sebelum fitur 2FA ada (zero regression, sesuai instruksi).
     *
     * Untuk role wajib (+ kill switch aktif): TIDAK PERNAH issue token
     * normal langsung dari sini. 2 kemungkinan token SEMENTARA (abilities
     * terbatas, expire 10 menit, direstrict EnforceTwoFactorTokenScope):
     * - two_factor_confirmed_at masih null -> setup_token (2FA belum
     *   pernah di-setup, WAJIB setup dulu sebelum bisa akses apapun).
     * - sudah confirmed -> challenge_token (WAJIB masukkan kode 2FA
     *   lewat POST /login/verify-2fa dulu baru dapat token normal).
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $employee = Employee::where('email', $request->email)->first();

        if (!$employee || !Hash::check($request->password, $employee->password)) {

            // Failed login - tetap dicatat walau employee gak ketemu sama
            // sekali (auditable_id null buat kasus itu), biar bisa dipakai
            // buat deteksi brute-force/percobaan login mencurigakan nanti.
            AuditLogService::logCustom(
                Employee::class,
                $employee?->id,
                'failed_login',
                null,
                null,
                null,
                "Percobaan login gagal untuk email: {$request->email}"
            );

            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.'
            ], 401);
        }

        if (config('security.two_factor_enforced') && $this->twoFactor->isRoleRequired($employee)) {

            $employee->tokens()->delete();

            if (!$employee->two_factor_confirmed_at) {

                $setupToken = $employee->createToken('2fa-setup', ['two-factor:setup'], now()->addMinutes(10))->plainTextToken;

                AuditLogService::log(
                    $employee,
                    'login_2fa_setup_required',
                    null,
                    null,
                    $employee->id,
                    'Login berhasil, tapi 2FA wajib di-setup dulu untuk role ini'
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Setup 2FA wajib untuk role ini sebelum bisa masuk.',
                    'requires_2fa_setup' => true,
                    'setup_token' => $setupToken,
                ]);
            }

            $challengeToken = $employee->createToken('2fa-challenge', ['two-factor:challenge'], now()->addMinutes(10))->plainTextToken;

            AuditLogService::log(
                $employee,
                'login_2fa_challenge_issued',
                null,
                null,
                $employee->id,
                'Login berhasil, menunggu kode 2FA'
            );

            return response()->json([
                'success' => true,
                'message' => 'Masukkan kode 2FA untuk melanjutkan.',
                'requires_2fa_code' => true,
                'challenge_token' => $challengeToken,
            ]);
        }

        // Hapus token lama (opsional)
        $employee->tokens()->delete();

        // Buat token baru
        $token = $employee->createToken('authToken')->plainTextToken;

        AuditLogService::log(
            $employee,
            'login',
            null,
            null,
            $employee->id,
            'Login berhasil'
        );

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'employee' => $employee
            ]
        ]);
    }

    /**
     * Step 2 login untuk role wajib 2FA yang sudah confirmed. Route
     * PUBLIC (BUKAN auth:sanctum) - challenge_token dikirim sebagai body
     * param (BUKAN Authorization header), diresolve manual lewat
     * PersonalAccessToken::findToken() (mekanisme SAMA yang dipakai
     * auth:sanctum di baliknya, cuma dipanggil langsung di sini tanpa
     * lewat guard/middleware) - employee-nya TIDAK PERNAH "authenticated"
     * secara resmi sebelum kode 2FA benar.
     *
     * throttle:5,1 di route (SAMA PERSIS /login) - ruang kode 6 digit
     * jauh lebih kecil dari password, wajib dibatasi biar gak rawan
     * brute-force.
     */
    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => 'required|string',
            'code' => 'nullable|digits:6',
            'recovery_code' => 'nullable|string',
        ]);

        if (empty($validated['code']) && empty($validated['recovery_code'])) {
            return response()->json([
                'success' => false,
                'message' => 'Kode 2FA atau recovery code wajib diisi.',
            ], 422);
        }

        $accessToken = PersonalAccessToken::findToken($validated['challenge_token']);

        if (!$accessToken || !$accessToken->can('two-factor:challenge') || ($accessToken->expires_at && $accessToken->expires_at->isPast())) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi login sudah tidak valid, silakan login ulang.',
            ], 401);
        }

        /** @var Employee $employee */
        $employee = $accessToken->tokenable;

        $verified = !empty($validated['code'])
            ? $this->twoFactor->verifyCode($employee->two_factor_secret, $validated['code'])
            : $this->twoFactor->verifyAndConsumeRecoveryCode($employee, $validated['recovery_code']);

        if (!$verified) {

            AuditLogService::logCustom(
                Employee::class,
                $employee->id,
                'failed_2fa_challenge',
                null,
                null,
                null,
                "Percobaan kode 2FA gagal untuk: {$employee->email}"
            );

            return response()->json([
                'success' => false,
                'message' => 'Kode 2FA tidak valid.',
            ], 401);
        }

        $employee->tokens()->delete();
        $token = $employee->createToken('authToken')->plainTextToken;

        AuditLogService::log(
            $employee,
            'login',
            null,
            null,
            $employee->id,
            'Login berhasil (2FA)'
        );

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'employee' => $employee
            ]
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request): JsonResponse
    {
        $employee = $request->user();

        $request->user()->currentAccessToken()->delete();

        AuditLogService::log(
            $employee,
            'logout',
            null,
            null,
            $employee->id,
            'Logout berhasil'
        );

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.'
        ]);
    }
}