<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_items', function (Blueprint $table) {
            $table->id();

            $table->string('item_code', 30)->unique();

            $table->string('item_name', 150);

            $table->string('category', 100)->nullable();

            $table->string('unit', 20)->default('pcs'); // pcs, box, unit, dll

            // stock_quantity dihitung otomatis dari total transaksi in-out,
            // TIDAK boleh diedit manual langsung lewat update()
            $table->integer('stock_quantity')->default(0);

            $table->integer('minimum_stock')->default(0);

            $table->text('description')->nullable();

            $table->boolean('is_active')->default(true);

            $table->softDeletes();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_items');
    }
};
