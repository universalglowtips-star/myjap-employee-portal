<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Root entity payroll - approval (Tahap 1) menempel di sini,
     * BUKAN di payslip individual. Jadi approve 1 periode = otomatis
     * berlaku buat semua payslip di periode itu, gak perlu approve
     * satu-satu per karyawan.
     *
     * period_type membedakan Regular/THR/Bonus/Off-cycle/Correction
     * tanpa perlu tabel atau kolom terpisah per jenis.
     *
     * status sengaja STRING (bukan enum) - biar approval workflow
     * Tahap 1 bisa nambah status baru (Pending Level 1, Pending
     * Level 2, dst) tanpa migration/ALTER TABLE.
     */
    public function up(): void
    {
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();

            $table->string('period_code', 50)->unique();

            $table->string('period_type', 30)->default('REGULAR');
            // REGULAR, THR, BONUS, OFF_CYCLE, CORRECTION

            $table->date('period_start');

            $table->date('period_end');

            $table->date('pay_date')->nullable();

            $table->string('status', 30)->default('Draft');
            // Draft -> (nanti Tahap 1: Submitted, Pending Level N) -> Approved -> Published

            $table->boolean('locked')->default(false);
            // Locked = payslip di dalamnya gak bisa diedit lagi sama sekali

            $table->timestamp('published_at')->nullable();

            $table->foreignId('published_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamps();

            $table->softDeletes();

            $table->index(['period_type', 'status']);
            $table->index(['period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_periods');
    }
};
