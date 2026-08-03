<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payroll period sekarang PER CABANG - satu bulan bisa punya
     * beberapa periode paralel (1 per office_location aktif), masing-
     * masing dengan approval sendiri-sendiri. Manager cabang A cuma
     * bisa approve periode cabang A, benar-benar terisolasi.
     *
     * office_location_id NULLABLE buat backward compat - periode lama
     * (dari Tahap 0, sebelum fitur ini) tetap dianggap "company-wide"
     * dan tidak dipaksa migrasi.
     *
     * restrict_to_office_location di step: HRD yang nentuin level mana
     * yang branch-scoped (biasanya Manager - approve cabang sendiri
     * aja) vs company-wide (biasanya Finance/HRD - approve lintas
     * cabang karena memang fungsi terpusat). Configurable, bukan
     * hardcode asumsi "semua level pasti branch-scoped".
     */
    public function up(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {

            $table->foreignId('office_location_id')
                ->nullable()
                ->after('period_type')
                ->constrained('office_locations')
                ->nullOnDelete();
        });

        Schema::table('approval_workflow_steps', function (Blueprint $table) {

            $table->boolean('restrict_to_office_location')->default(false)->after('approver_role_id');
        });

        Schema::table('payroll_approvals', function (Blueprint $table) {

            // Snapshot dari step saat submit - kalau workflow config
            // diubah belakangan, riwayat approval lama tetap akurat
            // sesuai aturan yang berlaku saat itu.
            $table->boolean('restrict_to_office_location')->default(false)->after('approver_role_id');
        });

        // Catatan: period_code SUDAH unique dari migration Tahap 0 -
        // gak perlu diubah, karena format baru (REGULAR-2026-07-BPN,
        // dengan suffix kode cabang) otomatis tetap unik secara global
        // tanpa perlu constraint tambahan.
    }

    public function down(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->dropForeign(['office_location_id']);
            $table->dropColumn('office_location_id');
        });

        Schema::table('approval_workflow_steps', function (Blueprint $table) {
            $table->dropColumn('restrict_to_office_location');
        });

        Schema::table('payroll_approvals', function (Blueprint $table) {
            $table->dropColumn('restrict_to_office_location');
        });
    }
};
