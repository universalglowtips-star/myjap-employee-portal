<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employee sekarang soft-delete - hapus karyawan TIDAK LAGI
     * menghapus permanen dari database, cuma nandain deleted_at.
     * Ini mempertahankan histori Payroll, Attendance, Leave,
     * Notification, dan Audit Log yang merujuk ke karyawan ini,
     * karena secara teknis baris employee-nya masih ada di tabel
     * (foreign key cascade tidak pernah ke-trigger).
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
