<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Kolom `work_shift_id` sudah didefinisikan di create_attendances_table.php
     * (commit 55f62ee, 2026-07-21). Migration ini awalnya mendefinisikan ulang
     * kolom yang sama secara tidak sengaja, menyebabkan migrate:fresh gagal
     * dengan "duplicate column name: work_shift_id" di server baru.
     * up()/down() dikosongkan jadi no-op - file tetap ada supaya entry di
     * tabel migrations (dev DB) yang sudah mencatatnya sebagai "Ran" tidak
     * jadi class-not-found kalau ada yang rollback ke titik ini.
     */
    public function up(): void
    {
        // no-op - lihat komentar di atas
    }

    public function down(): void
    {
        // no-op - lihat komentar di atas (dropConstrainedForeignId di sini
        // dulu akan salah drop kolom yang sebenarnya didefinisikan oleh
        // create_attendances_table.php, bukan migration ini)
    }
};
