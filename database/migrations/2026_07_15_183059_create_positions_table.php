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
 Schema::create('positions', function (Blueprint $table) {
        $table->id();

        // Relasi ke Departemen
        $table->foreignId('department_id')
              ->constrained('departments')
              ->cascadeOnUpdate()
              ->restrictOnDelete();

        // Kode Jabatan
        $table->string('position_code',20)->unique();

        // Nama Jabatan
        $table->string('position_name',100);

        // Tunjangan Jabatan
        $table->decimal('allowance',15,2)->default(0);

        // Deskripsi
        $table->text('description')->nullable();

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
        Schema::dropIfExists('positions');
    }
};
