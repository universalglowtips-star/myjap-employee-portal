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
Schema::create('employees', function (Blueprint $table) {

    $table->id();

    // Nomor Induk Karyawan
    $table->string('employee_code',20)->unique();

    // Data Relasi
    $table->foreignId('department_id')->constrained()->restrictOnDelete();

    $table->foreignId('position_id')->constrained()->restrictOnDelete();

    $table->foreignId('work_shift_id')->constrained()->restrictOnDelete();

    // Biodata
    $table->string('full_name',150);

    $table->string('email')->unique();

    $table->string('phone',20)->nullable();

    $table->string('password');

    $table->rememberToken();

    $table->date('birth_date')->nullable();

    $table->enum('gender',['L','P']);

    $table->text('address')->nullable();

    // Pekerjaan
    $table->date('join_date');

    $table->decimal('basic_salary',15,2)->default(0);

    // Foto
    $table->string('photo')->nullable();

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
        Schema::dropIfExists('employees');
    }
};
