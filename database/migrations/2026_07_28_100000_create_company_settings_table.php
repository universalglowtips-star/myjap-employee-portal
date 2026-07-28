<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel ini didesain sebagai "singleton" - cuma ada 1 baris data
     * (data perusahaan), bukan banyak baris kayak tabel lain. Nanti
     * kalau Website Admin (Phase 2) sudah ada, HRD tinggal edit lewat
     * form yang manggil endpoint ini, tanpa perlu sentuh kode/database.
     */
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();

            $table->string('company_name');

            $table->text('address')->nullable();

            $table->string('phone')->nullable();

            $table->string('email')->nullable();

            $table->string('logo')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
