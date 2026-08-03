<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Definisi workflow approval per period_type. HRD/SUPER_ADMIN bisa
     * bikin workflow beda buat REGULAR vs THR vs BONUS vs CORRECTION -
     * cukup 1 workflow AKTIF per period_type di satu waktu.
     *
     * Kalau period_type tertentu TIDAK punya workflow aktif, submit()
     * otomatis lewat tanpa approval sama sekali (langsung Approved) -
     * ini yang bikin approval "configurable: perlu approval atau tidak".
     */
    public function up(): void
    {
        Schema::create('approval_workflows', function (Blueprint $table) {
            $table->id();

            $table->string('name'); // "Regular Payroll Approval", "THR Approval", dst

            $table->string('applies_to_period_type', 30); // REGULAR, THR, BONUS, OFF_CYCLE, CORRECTION

            $table->boolean('is_active')->default(true);

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamps();

            $table->softDeletes();

            $table->index(['applies_to_period_type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_workflows');
    }
};
