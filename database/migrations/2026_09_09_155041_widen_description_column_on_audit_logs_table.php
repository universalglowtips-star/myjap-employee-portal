<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Utang teknis, fix terpisah dari task roadmap manapun (Task 13/14) -
     * disetujui eksplisit 2026-09-09 sebelum Task 14 mulai.
     *
     * description SELALU varchar(255) sejak migration awal
     * (2026_07_30_110000_create_audit_logs_table.php), gak pernah diubah.
     * Satu-satunya penulis kolom ini di seluruh codebase adalah
     * AuditLogService::logCustom() (dikonfirmasi grep - gak ada
     * AuditLog::create() lain, gak ada Str::limit()/truncation manual
     * dimanapun) - jadi memperbesar kolom ini menyelesaikan akar masalah
     * buat SEMUA pemakaian audit log, bukan cuma titik trigger
     * PayrollPeriodController::approve() yang kebetulan ketemu duluan.
     *
     * TEXT (bukan varchar yang lebih besar, mis. varchar(500)) - pesan
     * deskriptif di kolom ini sifatnya bebas panjang (mis. alasan
     * reject/notifikasi gabungan beberapa info), gak ada alasan bisnis
     * buat batasi ke angka tertentu. Gak ada index di kolom ini
     * (dikonfirmasi SHOW CREATE TABLE), jadi TEXT gak masalah performa
     * pencarian.
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->text('description')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('description', 255)->nullable()->change();
        });
    }
};
