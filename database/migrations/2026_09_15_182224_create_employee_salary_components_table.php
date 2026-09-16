<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15b - override nominal/tarif per Karyawan, per Komponen Gaji -
     * misal karena senioritas, walau jabatan sama. Resolusi saat generate
     * (lihat PayslipController::generateBulk()): ADA baris di sini -> pakai
     * ini; TIDAK ADA -> fallback ke position_salary_components lewat
     * employee.position_id; TIDAK ADA juga -> komponen itu TIDAK berlaku
     * buat karyawan ini sama sekali (bukan default ke 0).
     *
     * TIDAK ADA kolom alasan/catatan - override ini murni angka yang HRD
     * input manual, sistem TIDAK perlu tau alasannya (keputusan eksplisit
     * Bagus 2026-09-14/15 - tidak ada rumus otomatis berbasis masa kerja
     * untuk sekarang).
     */
    public function up(): void
    {
        Schema::create('employee_salary_components', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('salary_component_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->decimal('amount', 15, 2);

            $table->timestamps();

            $table->unique(['employee_id', 'salary_component_id'], 'employee_salary_components_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_salary_components');
    }
};
