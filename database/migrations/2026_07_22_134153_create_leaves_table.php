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
        Schema::create('leaves', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Relasi
            |--------------------------------------------------------------------------
            */

            $table->foreignId('employee_id')
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('employees')
                ->cascadeOnUpdate()
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Jenis Pengajuan
            |--------------------------------------------------------------------------
            */

            $table->enum('leave_type', [
                'Annual Leave',
                'Sick',
                'Permission',
                'Maternity',
                'Unpaid Leave',
                'Business Trip'
            ]);

            /*
            |--------------------------------------------------------------------------
            | Tanggal
            |--------------------------------------------------------------------------
            */

            $table->date('start_date');

            $table->date('end_date');

            $table->integer('total_days');

            /*
            |--------------------------------------------------------------------------
            | Alasan
            |--------------------------------------------------------------------------
            */

            $table->text('reason');

            /*
            |--------------------------------------------------------------------------
            | Lampiran
            |--------------------------------------------------------------------------
            */

            $table->string('attachment')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Approval
            |--------------------------------------------------------------------------
            */

            $table->enum('status', [
                'Pending',
                'Approved',
                'Rejected'
            ])->default('Pending');

            $table->timestamp('approved_at')->nullable();

            $table->text('approval_notes')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Timestamp
            |--------------------------------------------------------------------------
            */

            $table->softDeletes();

            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leaves');
    }
};