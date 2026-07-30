<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Attendance Location Policy - diatur per Position (jabatan), BUKAN
     * per Role sistem. Contoh: posisi Driver boleh absen di cabang
     * tertentu sesuai rute, posisi Staff Admin cuma boleh di Home Office.
     *
     * scope_type:
     * - HOME_ONLY          : cuma boleh absen di office_location_id milik employee sendiri
     * - ALL_BRANCHES       : boleh absen di kantor manapun yang aktif
     * - SPECIFIC_BRANCHES  : boleh absen di daftar kantor tertentu (lihat pivot policy_offices)
     * - SUPERVISED_BRANCHES: boleh absen di kantor-kantor yang dia awasi (lihat office_location_supervisors)
     */
    public function up(): void
    {
        Schema::create('attendance_location_policies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('position_id')
                ->unique()
                ->constrained('positions')
                ->cascadeOnDelete();

            $table->enum('scope_type', [
                'HOME_ONLY',
                'ALL_BRANCHES',
                'SPECIFIC_BRANCHES',
                'SUPERVISED_BRANCHES',
            ])->default('HOME_ONLY');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_location_policies');
    }
};
