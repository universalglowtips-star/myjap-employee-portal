<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::create('office_locations', function (Blueprint $table) {

        $table->id();

        // Informasi Kantor
        $table->string('office_code',20)->unique();
        $table->string('office_name',100);

        // Lokasi GPS
        $table->decimal('latitude',10,7);
        $table->decimal('longitude',10,7);

        // Radius Absensi (meter)
        $table->integer('radius_meter')->default(100);

        // Jam Kerja
        $table->time('check_in_start');
        $table->time('check_in_end');

        $table->time('check_out_start');
        $table->time('check_out_end');

        // Status
        $table->boolean('is_active')->default(true);

        // Catatan
        $table->text('description')->nullable();

        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('office_locations');
    }
};
