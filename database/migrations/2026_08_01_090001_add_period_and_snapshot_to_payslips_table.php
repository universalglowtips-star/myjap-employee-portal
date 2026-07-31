<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * department_id & office_location_id di sini adalah SNAPSHOT saat
     * payslip dibuat - kalau karyawan pindah departemen/cabang bulan
     * depan, payslip bulan ini TETAP menampilkan departemen/cabang
     * lamanya. Ini yang bikin laporan "total gaji per cabang" akurat
     * secara historis, bukan ikut berubah kalau data master berubah.
     *
     * gross_earning & total_deduction disimpan langsung (bukan
     * dihitung ulang dari payslip_items tiap kali) supaya reporting
     * gak perlu JOIN + GROUP BY berat setiap request.
     */
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {

            $table->foreignId('payroll_period_id')
                ->nullable() // nullable dulu, diisi lewat backfill migration berikutnya
                ->after('id')
                ->constrained('payroll_periods')
                ->cascadeOnDelete();

            $table->foreignId('department_id')
                ->nullable()
                ->after('employee_id')
                ->constrained('departments')
                ->nullOnDelete();

            $table->foreignId('office_location_id')
                ->nullable()
                ->after('department_id')
                ->constrained('office_locations')
                ->nullOnDelete();

            $table->decimal('gross_earning', 15, 2)->default(0)->after('net_salary');

            $table->decimal('total_deduction', 15, 2)->default(0)->after('gross_earning');

            $table->index(['month', 'year']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropForeign(['payroll_period_id']);
            $table->dropForeign(['department_id']);
            $table->dropForeign(['office_location_id']);
            $table->dropColumn(['payroll_period_id', 'department_id', 'office_location_id', 'gross_earning', 'total_deduction']);
            $table->dropIndex(['month', 'year']);
            $table->dropIndex(['status']);
        });
    }
};
