<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_attendance_location_override_id')
                ->constrained('employee_attendance_location_overrides', 'id')
                ->cascadeOnDelete();

            $table->foreignId('office_location_id')
                ->constrained('office_locations')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['employee_attendance_location_override_id', 'office_location_id'],
                'override_office_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_attendance_location_override_offices');
    }
};
