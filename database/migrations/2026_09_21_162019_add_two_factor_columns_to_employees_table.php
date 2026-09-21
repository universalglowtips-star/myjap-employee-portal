<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fitur 2FA (TOTP) - wajib untuk SUPER_ADMIN/HRD/FINANCE/DIRECTOR,
     * disetujui Bagus 2026-09-21 (lihat instruksi Fitur 2FA). Non-
     * destruktif, 3 kolom nullable di `employees` (model Authenticatable
     * yang beneran dipakai login - dikonfirmasi AuthController.php +
     * config/auth.php, `App\Models\User`/guard 'web' TIDAK dipakai sama
     * sekali di alur auth API ini, cuma scaffold default Laravel yang
     * gak pernah disentuh kode manapun).
     *
     * two_factor_secret & two_factor_recovery_codes TEXT (bukan string)
     * - dienkripsi lewat cast 'encrypted' di model (Employee::casts()),
     * ciphertext-nya lebih panjang dari plaintext aslinya, `string`
     * default (varchar 255) berisiko kepotong.
     *
     * two_factor_confirmed_at NULL = 2FA belum aktif/belum selesai
     * setup (termasuk kondisi "secret sudah di-generate tapi user belum
     * scan+konfirmasi kode" - state pending, BUKAN "sudah aktif").
     * Employee lama existing otomatis NULL di semua 3 kolom pas
     * migration ini jalan - PERSIS efek yang diinginkan (dipaksa setup
     * di login berikutnya kalau role-nya termasuk 4 wajib).
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at']);
        });
    }
};
