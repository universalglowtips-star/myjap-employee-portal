<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Override attendance location per karyawan individu - prioritas
     * PALING TINGGI, mengalahkan policy per Position. Dipakai buat
     * kasus khusus: karyawan tertentu butuh akses lokasi absen beda
     * dari jabatannya.
     */
    public function up(): void
    {
        Schema::create('employee_attendance_location_overrides', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_id')
                ->unique()
                ->constrained('employees')
                ->cascadeOnDelete();

            $table->enum('scope_type', [
                'HOME_ONLY',
                'ALL_BRANCHES',
                'SPECIFIC_BRANCHES',
                'SUPERVISED_BRANCHES',
            ]);

            // Override bisa berlaku permanen (kedua kolom null) atau
            // sementara (misal dinas 2 minggu) - otomatis gak berlaku
            // lagi di luar rentang ini, balik ke Position Policy.
            $table->date('effective_start_date')->nullable();

            $table->date('effective_end_date')->nullable();

            $table->text('reason')->nullable();

            $table->foreignId('created_by')
                ->constrained('employees')
                ->cascadeOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_attendance_location_overrides');
    }
};
