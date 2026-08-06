<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Beda dari audit_logs (histori kejadian, immutable, buat forensik)
     * - tabel ini buat WARNING OPERASIONAL yang butuh DITINDAKLANJUTI
     * SUPER_ADMIN/HRD, makanya ada is_resolved (bisa "ditutup" begitu
     * ditangani). Bukan pengganti audit log, tapi pelengkap - kejadian
     * yang sama tetap dicatat di audit_logs (immutable) DAN warning
     * di sini (actionable, bisa resolved).
     */
    public function up(): void
    {
        Schema::create('system_warnings', function (Blueprint $table) {
            $table->id();

            $table->string('type', 50); // 'notification_no_recipients', dst - bisa nambah jenis lain nanti

            $table->string('related_type')->nullable(); // polymorphic - bisa nunjuk PayrollPeriod, atau entitas lain nanti

            $table->unsignedBigInteger('related_id')->nullable();

            $table->text('message');

            $table->boolean('is_resolved')->default(false);

            $table->foreignId('resolved_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index(['related_type', 'related_id']);
            $table->index(['type', 'is_resolved']);

            // Unique constraint - INI yang beneran mencegah 2 warning
            // duplikat kalau 2 request nyaris bersamaan (race condition),
            // bukan cuma pengecekan di level aplikasi yang bisa
            // ke-lewatin. Begitu satu warning untuk (type+related+
            // is_resolved=false) sudah ada, insert kedua akan GAGAL
            // di level database - firstOrCreate() di model menangkap
            // ini dan otomatis ambil yang sudah ada.
            //
            // Kenapa is_resolved ikut masuk unique key: begitu warning
            // lama di-resolve (is_resolved=true), warning BARU untuk
            // kejadian serupa di masa depan tetap boleh dibuat (nilai
            // is_resolved beda = kombinasi unique beda) - sesuai desain
            // "harus resolve manual dulu sebelum masalah serupa
            // berikutnya dianggap kejadian baru".
            $table->unique(
                ['type', 'related_type', 'related_id', 'is_resolved'],
                'system_warnings_dedup_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_warnings');
    }
};
