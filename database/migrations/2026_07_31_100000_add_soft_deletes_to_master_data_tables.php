<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master data (Department, Position, Role, Work Shift, Office
     * Location) sekarang soft delete juga - sama alasannya kayak
     * Employee: data historis (Payslip, Attendance lama) sering
     * merujuk ke master data yang "sudah tidak dipakai lagi", tapi
     * kalau di-hard-delete, riwayat lama jadi kehilangan konteks
     * (foreign key null / error kalau ada relasi ketat).
     */
    public function up(): void
    {
        Schema::table('departments', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('positions', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('roles', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('work_shifts', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('office_locations', fn (Blueprint $table) => $table->softDeletes());
    }

    public function down(): void
    {
        Schema::table('departments', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('positions', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('roles', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('work_shifts', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('office_locations', fn (Blueprint $table) => $table->dropSoftDeletes());
    }
};
