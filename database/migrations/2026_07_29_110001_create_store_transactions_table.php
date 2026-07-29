<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('store_item_id')
                ->constrained('store_items')
                ->cascadeOnDelete();

            $table->enum('type', ['in', 'out']);

            $table->integer('quantity');

            // Karyawan terkait - buat 'out' berarti yang menerima/minta barang
            $table->foreignId('employee_id')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            // Siapa yang input transaksi ini (admin/gudang)
            $table->foreignId('created_by')
                ->constrained('employees')
                ->cascadeOnDelete();

            $table->date('transaction_date');

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['store_item_id', 'transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_transactions');
    }
};
