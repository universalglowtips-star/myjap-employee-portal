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
    Schema::create('work_shifts', function (Blueprint $table) {

        $table->id();

        // Kode Shift
        $table->string('shift_code',20)->unique();

        // Nama Shift
        $table->string('shift_name',100);

        // Jam Masuk
        $table->time('check_in_time');

        // Jam Pulang
        $table->time('check_out_time');

        // Jam Mulai Istirahat
        $table->time('break_start')->nullable();

        // Jam Selesai Istirahat
        $table->time('break_end')->nullable();

        // Toleransi Terlambat (menit)
        $table->integer('late_tolerance')->default(15);

        // Status
        $table->boolean('is_active')->default(true);

        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_shifts');
    }
};
