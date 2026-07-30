<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Global Audit Log - reusable untuk SEMUA modul (Employee, Attendance,
     * Leave, Payroll, Department, Position, Office Location, Role,
     * Permission, Salary Component, Attendance Location Policy, dll).
     *
     * Polymorphic (auditable_type + auditable_id) supaya 1 tabel ini
     * cukup buat semua model, tidak perlu bikin tabel audit terpisah
     * per modul.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Model & id yang diaudit, contoh: App\Models\Employee, id 5.
            // auditable_id nullable - dipakai buat kasus kayak failed login
            // yang emailnya gak ketemu sama sekali di database.
            $table->string('auditable_type');

            $table->unsignedBigInteger('auditable_id')->nullable();

            // Bebas, bukan enum kaku - contoh: created, updated, deleted,
            // approved, rejected, published, policy_updated, login,
            // logout, failed_login, password_reset, dll
            $table->string('action', 50);

            $table->json('old_values')->nullable();

            $table->json('new_values')->nullable();

            $table->foreignId('changed_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->string('ip_address', 45)->nullable();

            // web, flutter-android, flutter-ios, api, dll - dari header
            // X-App-Source yang dikirim client
            $table->string('source', 30)->nullable();

            $table->text('user_agent')->nullable();

            $table->string('description')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index('changed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
