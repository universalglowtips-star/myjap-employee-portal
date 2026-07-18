<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {

            $table->foreignId('office_location_id')
                ->after('work_shift_id')
                ->constrained('office_locations')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {

            $table->dropForeign(['office_location_id']);
            $table->dropColumn('office_location_id');

        });
    }
};