<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * check_in_photo/check_out_photo awalnya VARCHAR(255) - cukup buat
     * path/URL string, TAPI Employee Home (Task 9.5) kirim foto asli
     * sebagai base64 data URI langsung di body JSON (gak ada endpoint
     * upload file terpisah buat field ini) - selalu jauh lebih panjang
     * dari 255 char, ke-truncate/ditolak MySQL ("Data too long for
     * column"). Naikin ke LONGTEXT (raw SQL, BUKAN Schema::change() -
     * doctrine/dbal gak ter-install di project ini) - foto tetap
     * di-downscale di frontend sebelum dikirim (lihat
     * AttendanceCheckModal.tsx) supaya payload-nya tetap wajar,
     * LONGTEXT cuma jaga-jaga gak ada limit ketat di sisi kolom.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE attendances MODIFY check_in_photo LONGTEXT NULL');
        DB::statement('ALTER TABLE attendances MODIFY check_out_photo LONGTEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE attendances MODIFY check_in_photo VARCHAR(255) NULL');
        DB::statement('ALTER TABLE attendances MODIFY check_out_photo VARCHAR(255) NULL');
    }
};
