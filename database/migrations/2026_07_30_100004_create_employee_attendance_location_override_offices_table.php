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

            $table->unsignedBigInteger('employee_attendance_location_override_id');

            $table->unsignedBigInteger('office_location_id');

            $table->foreign('employee_attendance_location_override_id', 'ealo_offices_override_fk')
                ->references('id')->on('employee_attendance_location_overrides')
                ->cascadeOnDelete();

            $table->foreign('office_location_id', 'ealo_offices_office_fk')
                ->references('id')->on('office_locations')
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
