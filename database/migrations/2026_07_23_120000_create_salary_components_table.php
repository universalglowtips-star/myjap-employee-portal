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
    Schema::create('salary_components', function (Blueprint $table) {

        $table->id();

        $table->string('code', 20)->unique();

        $table->string('name', 100);

        $table->enum('type', [
            'earning',
            'deduction'
        ]);

        $table->decimal('default_amount', 15, 2)->default(0);

        $table->boolean('is_taxable')->default(false);

        $table->boolean('is_required')->default(false);

        $table->boolean('is_active')->default(true);

        $table->text('description')->nullable();

        $table->timestamps();

        $table->softDeletes();

    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_components');
    }
};
