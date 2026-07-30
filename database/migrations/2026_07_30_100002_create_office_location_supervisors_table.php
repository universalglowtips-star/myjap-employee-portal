<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Siapa (employee) mengawasi kantor/cabang mana. Dipakai buat
     * scope_type SUPERVISED_BRANCHES - 1 supervisor bisa mengawasi
     * lebih dari 1 cabang, dan 1 cabang bisa diawasi lebih dari 1 orang.
     */
    public function up(): void
    {
        Schema::create('office_location_supervisors', function (Blueprint $table) {
            $table->id();

            $table->foreignId('office_location_id')
                ->constrained('office_locations')
                ->cascadeOnDelete();

            $table->foreignId('employee_id')
                ->constrained('employees')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['office_location_id', 'employee_id'],
                'office_supervisor_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('office_location_supervisors');
    }
};
