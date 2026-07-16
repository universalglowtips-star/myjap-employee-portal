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
    Schema::create('attendances', function (Blueprint $table) {

        $table->id();

        /*
        |--------------------------------------------------------------------------
        | Relasi
        |--------------------------------------------------------------------------
        */

        $table->foreignId('employee_id')
              ->constrained()
              ->cascadeOnUpdate()
              ->cascadeOnDelete();

        $table->foreignId('office_location_id')
              ->constrained()
              ->cascadeOnUpdate()
              ->restrictOnDelete();

        /*
        |--------------------------------------------------------------------------
        | Tanggal Absensi
        |--------------------------------------------------------------------------
        */

        $table->date('attendance_date');
        $table->unique([
        'employee_id',
        'attendance_date'
       ]);

        /*
        |--------------------------------------------------------------------------
        | Check In
        |--------------------------------------------------------------------------
        */

        $table->dateTime('check_in')->nullable();

        $table->decimal('check_in_latitude',10,7)->nullable();

        $table->decimal('check_in_longitude',10,7)->nullable();

        $table->string('check_in_photo')->nullable();

        /*
        |--------------------------------------------------------------------------
        | Check Out
        |--------------------------------------------------------------------------
        */

        $table->dateTime('check_out')->nullable();

        $table->decimal('check_out_latitude',10,7)->nullable();

        $table->decimal('check_out_longitude',10,7)->nullable();

        $table->string('check_out_photo')->nullable();

        $table->string('device_name')->nullable();

        $table->ipAddress('ip_address')->nullable();

        /*
        |--------------------------------------------------------------------------
        | Status
        |--------------------------------------------------------------------------
        */

        $table->enum('attendance_status',[
            'Present',
            'Late',
            'Leave',
            'Sick',
            'Permission',
            'Absent'
        ])->default('Present');

        /*
        |--------------------------------------------------------------------------
        | Perhitungan
        |--------------------------------------------------------------------------
        */

        $table->integer('late_minutes')->default(0);

        $table->decimal('working_hours',5,2)->default(0);

        $table->decimal('overtime_hours',5,2)->default(0);

        /*
        |--------------------------------------------------------------------------
        | Approval
        |--------------------------------------------------------------------------
        */

        $table->boolean('is_valid_location')->default(false);

        $table->boolean('is_valid_selfie')->default(false);

        $table->boolean('is_approved')->default(true);

        /*
        |--------------------------------------------------------------------------
        | Catatan
        |--------------------------------------------------------------------------
        */

        $table->text('notes')->nullable();

        $table->softDeletes();

        $table->timestamps();

    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
