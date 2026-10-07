<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix anti-replay TOTP (temuan S6 uji keamanan 2FA, 2026-10-07) -
     * verifyKey() polos yang dipakai sebelumnya tidak melacak kode mana
     * yang sudah pernah dipakai, jadi kode valid yang sama bisa login
     * berulang kali selama masih dalam window waktunya. Kolom ini
     * nyimpen UNIX TIMESTAMP INTEGER mentah dari verifyKeyNewer()
     * (BUKAN kolom timestamp Laravel biasa seperti dua_factor_confirmed_at
     * - nilainya counter time-slot dari library google2fa, bukan jam
     * kalender), dipakai AuthController::verifyTwoFactor() buat nolak
     * kode yang timestamp slot-nya <= terakhir kali berhasil dipakai.
     * Nullable, default NULL buat semua employee existing - non-
     * destruktif, tidak memaksa re-setup 2FA siapapun.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->unsignedBigInteger('two_factor_last_used_at')->nullable()->after('two_factor_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('two_factor_last_used_at');
        });
    }
};
