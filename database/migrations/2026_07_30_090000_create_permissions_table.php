<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master daftar permission granular, dikelompokkan per modul.
     * permission_code format: "{module}.{action}", contoh: "leave.approve".
     * Tabel ini murni data referensi - diisi lewat seeder, bisa
     * ditambah lewat migration baru kalau ada modul baru nanti,
     * TANPA perlu ubah struktur tabel ini lagi.
     */
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();

            $table->string('module', 50);

            $table->string('action', 50);

            $table->string('permission_code', 120)->unique();

            $table->string('description')->nullable();

            $table->timestamps();

            $table->index('module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
