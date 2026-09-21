<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fitur 2FA - setup_token/challenge_token (dibuat AuthController::login()
 * dengan abilities terbatas, BUKAN '*') gak boleh bisa dipakai akses
 * endpoint LAIN selain yang eksplisit dimaksudkan, walau lolos
 * auth:sanctum (token-nya valid, employee-nya benar) - itu PERSIS
 * requirement eksplisit di instruksi fitur ini ("TIDAK BISA dipakai
 * akses endpoint lain").
 *
 * Token NORMAL (createToken() tanpa parameter abilities, default '*')
 * TIDAK terpengaruh sama sekali - lolos cepat di baris pertama,
 * dipasang di SEMUA route (legacy + /v1) tapi nol dampak ke 61 route
 * permission-gated yang sudah ada, gak nyentuh satupun definisi route
 * itu (sesuai backend freeze - cuma nambah middleware baru, bukan
 * ngubah route existing).
 */
class EnforceTwoFactorTokenScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if (!$token || $token->can('*')) {
            return $next($request);
        }

        if ($token->can('two-factor:setup') && ($request->is('api/two-factor/*') || $request->is('api/v1/two-factor/*'))) {
            return $next($request);
        }

        // challenge_token (ability 'two-factor:challenge') SENGAJA TIDAK
        // pernah diizinkan lewat sini sama sekali - pemakaian sahnya
        // cuma sebagai body param ke POST /login/verify-2fa (route
        // PUBLIC, gak lewat auth:sanctum/middleware ini sama sekali).
        // Kalau somehow dipaksa lewat header Authorization ke sini, itu
        // di luar pemakaian yang dimaksud - default ditolak.
        return response()->json([
            'success' => false,
            'message' => 'Token ini terbatas untuk setup 2FA, tidak bisa dipakai akses endpoint lain.',
        ], 403);
    }
}
