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
    Schema::create('departments', function (Blueprint $table) {
        $table->id();

        // Kode Departemen
        $table->string('department_code', 20)->unique();

        // Nama Departemen
        $table->string('department_name', 100);

        // Deskripsi Departemen
        $table->text('description')->nullable();

        // Status Aktif / Tidak Aktif
        $table->boolean('is_active')->default(true);

        // Created At & Updated At
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
