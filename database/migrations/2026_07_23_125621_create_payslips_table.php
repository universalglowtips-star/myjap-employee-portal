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
    Schema::create('payslips', function (Blueprint $table) {

    $table->id();

    $table->foreignId('employee_id')
        ->constrained()
        ->cascadeOnDelete();

    $table->unsignedTinyInteger('month');

    $table->unsignedSmallInteger('year');

    $table->decimal('net_salary',15,2)->default(0);

    $table->enum('status',[
        'Draft',
        'Published'
    ])->default('Draft');

    $table->string('file_pdf')->nullable();

    $table->timestamps();

    $table->softDeletes();

   });

}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
