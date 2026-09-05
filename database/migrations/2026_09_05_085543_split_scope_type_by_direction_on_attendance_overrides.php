<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * scope_type SEBELUMNYA 1 kolom berlaku buat check-in DAN check-out
     * sekaligus - dipecah jadi scope_type_check_in/scope_type_check_out
     * supaya bisa beda per arah (misal wajib di kantor pas masuk, bebas
     * lokasi pas pulang). Kolom lama TETAP ada 2 baris data sekarang
     * (id=2, id=9) - dibackfill ke KEDUA kolom baru (nilai sama seperti
     * sebelumnya, karena dulu 1 aturan buat 2 arah), baru scope_type lama
     * dihapus.
     *
     * ADD COLUMN (baru) dan dropColumn TIDAK butuh doctrine/dbal - itu
     * cuma dibutuhkan Laravel buat ->change() (modifikasi kolom yang
     * SUDAH ada). Enum baru ditambah nullable dulu (supaya ADD COLUMN
     * gak gagal di tabel yang udah ada isinya), dibackfill via UPDATE
     * biasa, baru di-NOT NULL-kan lewat DB::statement() raw SQL -
     * PERSIS pola migration LONGTEXT sebelumnya (project ini gak punya
     * doctrine/dbal ter-install, MODIFY COLUMN manapun wajib raw SQL).
     */
    public function up(): void
    {
        Schema::table('employee_attendance_location_overrides', function (Blueprint $table) {
            $table->enum('scope_type_check_in', [
                'HOME_ONLY',
                'ALL_BRANCHES',
                'SPECIFIC_BRANCHES',
                'SUPERVISED_BRANCHES',
                'ANYWHERE',
            ])->nullable()->after('employee_id');

            $table->enum('scope_type_check_out', [
                'HOME_ONLY',
                'ALL_BRANCHES',
                'SPECIFIC_BRANCHES',
                'SUPERVISED_BRANCHES',
                'ANYWHERE',
            ])->nullable()->after('scope_type_check_in');
        });

        DB::table('employee_attendance_location_overrides')->update([
            'scope_type_check_in' => DB::raw('scope_type'),
            'scope_type_check_out' => DB::raw('scope_type'),
        ]);

        DB::statement("ALTER TABLE employee_attendance_location_overrides MODIFY scope_type_check_in ENUM('HOME_ONLY','ALL_BRANCHES','SPECIFIC_BRANCHES','SUPERVISED_BRANCHES','ANYWHERE') NOT NULL");
        DB::statement("ALTER TABLE employee_attendance_location_overrides MODIFY scope_type_check_out ENUM('HOME_ONLY','ALL_BRANCHES','SPECIFIC_BRANCHES','SUPERVISED_BRANCHES','ANYWHERE') NOT NULL");

        Schema::table('employee_attendance_location_overrides', function (Blueprint $table) {
            $table->dropColumn('scope_type');
        });
    }

    public function down(): void
    {
        Schema::table('employee_attendance_location_overrides', function (Blueprint $table) {
            $table->enum('scope_type', [
                'HOME_ONLY',
                'ALL_BRANCHES',
                'SPECIFIC_BRANCHES',
                'SUPERVISED_BRANCHES',
            ])->nullable()->after('employee_id');
        });

        // Rollback konservatif: pakai nilai scope_type_check_in sebagai
        // scope_type gabungan (kalau check_in/check_out sempat dibikin
        // beda sebelum rollback, nilai check_out akan HILANG - unavoidable,
        // skema lama emang cuma punya 1 kolom).
        DB::statement("UPDATE employee_attendance_location_overrides SET scope_type = scope_type_check_in WHERE scope_type_check_in != 'ANYWHERE'");
        DB::statement("UPDATE employee_attendance_location_overrides SET scope_type = 'ALL_BRANCHES' WHERE scope_type_check_in = 'ANYWHERE'");

        DB::statement("ALTER TABLE employee_attendance_location_overrides MODIFY scope_type ENUM('HOME_ONLY','ALL_BRANCHES','SPECIFIC_BRANCHES','SUPERVISED_BRANCHES') NOT NULL");

        Schema::table('employee_attendance_location_overrides', function (Blueprint $table) {
            $table->dropColumn(['scope_type_check_in', 'scope_type_check_out']);
        });
    }
};
