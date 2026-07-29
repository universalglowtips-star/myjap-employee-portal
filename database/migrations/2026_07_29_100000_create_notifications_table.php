<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_id')
                ->constrained('employees')
                ->cascadeOnDelete();

            // Kode jenis notifikasi, misal: leave_approved, leave_rejected,
            // leave_cancelled, payslip_published, payslip_unpublished
            $table->string('type');

            $table->string('title');

            $table->text('message');

            // Payload tambahan (misal: leave_id, payslip_id) supaya
            // frontend bisa langsung redirect ke halaman terkait
            $table->json('data')->nullable();

            $table->boolean('is_read')->default(false);

            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            $table->index(['employee_id', 'is_read']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
