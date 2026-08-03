<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 1 baris per level per submission_cycle. Setiap kali period
     * disubmit (termasuk submit ulang setelah reject), SEMUA baris
     * untuk cycle itu dibuat baru dengan status Pending - baris dari
     * cycle SEBELUMNYA (termasuk yang approved sebagian sebelum
     * di-reject) TIDAK PERNAH diubah/dihapus, tetap ada sebagai jejak
     * audit permanen.
     *
     * approver_role_id di sini SNAPSHOT dari approval_workflow_steps
     * saat submit - kalau HRD ubah konfigurasi workflow belakangan,
     * riwayat approval lama tetap akurat sesuai role yang berlaku
     * saat itu (immutability historis, konsisten sama prinsip
     * snapshot di Tahap 0).
     */
    public function up(): void
    {
        Schema::create('payroll_approvals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payroll_period_id')
                ->constrained('payroll_periods')
                ->cascadeOnDelete();

            $table->unsignedInteger('submission_cycle');

            $table->unsignedTinyInteger('level');

            $table->foreignId('approver_role_id')
                ->constrained('roles')
                ->restrictOnDelete();

            $table->string('status', 20)->default('Pending'); // Pending, Approved, Rejected

            $table->foreignId('acted_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamp('acted_at')->nullable();

            $table->text('notes')->nullable(); // wajib diisi kalau status Rejected (divalidasi di controller)

            $table->timestamps();

            $table->unique(['payroll_period_id', 'submission_cycle', 'level'], 'payroll_approval_cycle_level_unique');

            $table->index(['approver_role_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_approvals');
    }
};
