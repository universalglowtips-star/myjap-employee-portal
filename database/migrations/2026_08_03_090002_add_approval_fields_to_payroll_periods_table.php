<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * submission_cycle naik tiap kali submit ulang (setelah reject) -
     * ini yang bikin riwayat reject sebelumnya TIDAK ketimpa, karena
     * payroll_approvals baru selalu pakai submission_cycle yang baru,
     * sementara baris punya cycle lama tetap ada sebagai jejak historis.
     *
     * current_approval_level nunjukin level mana yang lagi Pending
     * SEKARANG - satu-satunya sumber kebenaran "giliran siapa", dipakai
     * approve()/reject() buat mastiin urutan gak bisa dilompatin.
     */
    public function up(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {

            $table->foreignId('approval_workflow_id')
                ->nullable()
                ->after('period_type')
                ->constrained('approval_workflows')
                ->nullOnDelete();

            $table->unsignedInteger('submission_cycle')->default(0)->after('status');

            $table->unsignedTinyInteger('current_approval_level')->nullable()->after('submission_cycle');

            $table->timestamp('submitted_at')->nullable()->after('current_approval_level');

            $table->foreignId('submitted_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('employees')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->dropForeign(['approval_workflow_id']);
            $table->dropForeign(['submitted_by']);
            $table->dropColumn(['approval_workflow_id', 'submission_cycle', 'current_approval_level', 'submitted_at', 'submitted_by']);
        });
    }
};
