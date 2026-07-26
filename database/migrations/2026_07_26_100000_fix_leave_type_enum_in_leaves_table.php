<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Samakan pilihan leave_type jadi satu standar yang konsisten
     * di migration, StoreLeaveRequest, dan UpdateLeaveRequest:
     * Annual Leave, Sick Leave, Permission, Maternity Leave, Unpaid Leave, Business Trip
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE leaves
            MODIFY leave_type ENUM(
                'Annual Leave',
                'Sick Leave',
                'Permission',
                'Maternity Leave',
                'Unpaid Leave',
                'Business Trip'
            ) NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            ALTER TABLE leaves
            MODIFY leave_type ENUM(
                'Annual Leave',
                'Sick',
                'Permission',
                'Maternity Leave',
                'Unpaid Leave',
                'Business Trip'
            ) NOT NULL
        ");
    }
};
