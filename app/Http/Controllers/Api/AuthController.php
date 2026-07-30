<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    /**
     * Login
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