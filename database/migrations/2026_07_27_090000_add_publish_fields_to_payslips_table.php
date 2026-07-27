<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom pencatatan siapa & kapan payslip di-publish,
     * dan alasan kalau di-unpublish lagi (untuk revisi).
     */
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {

            $table->foreignId('published_by')
                ->nullable()
                ->after('status')
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamp('published_at')->nullable()->after('published_by');

            $table->text('unpublish_reason')->nullable()->after('published_at');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropForeign(['published_by']);
            $table->dropColumn(['published_by', 'published_at', 'unpublish_reason']);
        });
    }
};
