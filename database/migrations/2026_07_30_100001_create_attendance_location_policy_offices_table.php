<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Daftar kantor yang diizinkan buat policy dengan scope_type
     * SPECIFIC_BRANCHES, contoh: Driver rute Balikpapan-Samarinda.
     */
    public function up(): void
    {
        Schema::create('attendance_location_policy_offices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('attendance_location_policy_id')
                ->constrained('attendance_location_policies')
                ->cascadeOnDelete();

            $table->foreignId('office_location_id')
                ->constrained('office_locations')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['attendance_location_policy_id', 'office_location_id'],
                'policy_office_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_location_policy_offices');
    }
};
