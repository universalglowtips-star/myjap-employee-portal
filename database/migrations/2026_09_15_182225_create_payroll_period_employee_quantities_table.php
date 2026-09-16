<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15b - "Jumlah" per periode per karyawan per komponen
     * scheduled_variable (Hari Kerja untuk Uang Harian, Jumlah Resi untuk
     * Bonus DLV, dst). HRD isi ini SEBELUM generate (tahap "Isi Data
     * Periode" di halaman Detail Periode Payroll) - generateBulk() baca
     * quantity x tarif dari sini, BUKAN dari attendances langsung
     * (attendances cuma sumber angka SARAN buat pre-fill, tetap 100%
     * editable manual, TIDAK ADA rumus/aturan kaku).
     *
     * quantity disimpan PER KOMPONEN (bukan 1 angka HK global per
     * karyawan per periode) - temuan penting dari data Excel asli: Jumlah
     * buat 1 komponen bisa beda dari komponen lain buat orang yang sama
     * (misal Hari Kerja utk Uang Harian vs Jumlah Resi utk Bonus DLV,
     * dua-duanya scheduled_variable tapi "jumlah"-nya independen).
     */
    public function up(): void
    {
        Schema::create('payroll_period_employee_quantities', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payroll_period_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('employee_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('salary_component_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->decimal('quantity', 10, 2);

            $table->timestamps();

            $table->unique(['payroll_period_id', 'employee_id', 'salary_component_id'], 'period_employee_component_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_period_employee_quantities');
    }
};
