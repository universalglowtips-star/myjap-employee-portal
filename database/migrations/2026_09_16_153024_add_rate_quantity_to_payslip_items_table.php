<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15b (gap ketahuan dari verifikasi visual - instruksi Fase 2
     * C.6+E.3 asli kelewat waktu build). Simpan rate & quantity yang
     * DIPAKAI saat generateBulk() hitung amount = rate x quantity buat
     * komponen scheduled_variable, biar breakdown formula bisa
     * ditampilkan di Detail Slip Gaji - amount sendiri TETAP satu-satunya
     * sumber Total (cara hitung Total tidak berubah), 2 kolom ini murni
     * buat tampilan.
     *
     * NULLABLE, non-destruktif - baris lama (termasuk 6 payslip
     * Published id 2/4/5/6/7/8, semua dibuat sebelum kolom ini ada)
     * tetap null selamanya, bukan di-backfill dengan angka tebakan.
     * Item kategori fixed/situational JUGA sengaja selalu null (gak ada
     * konsep rate x quantity buat keduanya) - null di sini bukan cuma
     * "data lama", tapi juga makna permanen "komponen ini bukan hasil
     * perkalian".
     */
    public function up(): void
    {
        Schema::table('payslip_items', function (Blueprint $table) {
            $table->decimal('rate', 15, 2)->nullable()->after('amount');
            $table->decimal('quantity', 10, 2)->nullable()->after('rate');
        });
    }

    public function down(): void
    {
        Schema::table('payslip_items', function (Blueprint $table) {
            $table->dropColumn(['rate', 'quantity']);
        });
    }
};
