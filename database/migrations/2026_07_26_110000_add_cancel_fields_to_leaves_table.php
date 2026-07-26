<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tambah status 'Cancelled' untuk pembatalan resmi cuti yang sudah Approved,
     * beserta kolom pencatatan siapa & kapan yang membatalkan, dan alasannya.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE leaves
            MODIFY status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled')
            NOT NULL DEFAULT 'Pending'
        ");

        Schema::table('leaves', function (Blueprint $table) {

            $table->foreignId('cancelled_by')
                ->nullable()
                ->after('approval_notes')
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');

            $table->text('cancel_reason')->nullable()->after('cancelled_at');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropForeign(['cancelled_by']);
            $table->dropColumn(['cancelled_by', 'cancelled_at', 'cancel_reason']);
        });

        DB::statement("
            ALTER TABLE leaves
            MODIFY status ENUM('Pending', 'Approved', 'Rejected')
            NOT NULL DEFAULT 'Pending'
        ");
    }
};
