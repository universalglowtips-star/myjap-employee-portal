<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15b - default nominal (category fixed) ATAU tarif (category
     * scheduled_variable) per Jabatan, per Komponen Gaji. Keberadaan
     * baris = komponen ini BERLAKU untuk jabatan ini - komponen TIDAK
     * otomatis berlaku ke semua jabatan (misal Tunj. Rawat Mobil cuma
     * relevan buat jabatan tertentu). Absennya baris = jabatan itu gak
     * dapat komponen tersebut sama sekali, BUKAN dapat dengan nominal 0.
     */
    public function up(): void
    {
        Schema::create('position_salary_components', function (Blueprint $table) {
            $table->id();

            $table->foreignId('position_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('salary_component_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->decimal('amount', 15, 2)->default(0.00);

            $table->timestamps();

            $table->unique(['position_id', 'salary_component_id'], 'position_salary_components_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('position_salary_components');
    }
};
