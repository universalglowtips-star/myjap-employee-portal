<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pivot SPECIFIC_BRANCHES SEBELUMNYA cuma (override_id, office_id) -
     * 1 daftar cabang berlaku buat check-in DAN check-out sekaligus.
     * Sekarang butuh direction supaya daftar cabang bisa BEDA per arah.
     * Baris lama (4 baris, semua milik override id=9) di-DUPLIKASI jadi
     * 2 (CHECK_IN + CHECK_OUT) - persis prinsip yang sama dengan
     * scope_type_check_in/check_out di migration sebelumnya: dulu 1
     * aturan buat 2 arah, jadi backfill-nya disalin ke keduanya, bukan
     * ditaruh di salah satu doang.
     *
     * URUTAN LANGKAH PENTING (ketemu lewat percobaan gagal pertama):
     * index unique LAMA (override_id, office_id) ternyata jadi satu-
     * satunya index pendukung foreign key ealo_offices_override_fk
     * (employee_attendance_location_override_id ada di posisi PERTAMA
     * index itu) - MySQL/MariaDB MENOLAK drop index itu duluan
     * ("1553 Cannot drop index: needed in a foreign key constraint").
     * Index composite BARU (yang juga diawali kolom yang sama) harus
     * dibuat DULU sebagai pengganti sebelum index lama didrop, supaya
     * FK selalu punya index pendukung yang valid di setiap titik waktu.
     */
    public function up(): void
    {
        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->enum('direction', ['CHECK_IN', 'CHECK_OUT'])->nullable()->after('office_location_id');
        });

        // Index composite baru DIBUAT DULU (direction masih NULL di semua
        // baris di titik ini - aman, NULL gak dianggap sama dengan NULL
        // lain buat unique constraint, dan office_location_id per baris
        // toh sudah beda-beda per override_id yang sama).
        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->unique(
                ['employee_attendance_location_override_id', 'office_location_id', 'direction'],
                'override_office_direction_unique'
            );
        });

        // Sekarang index baru sudah ada buat "menggantikan" index lama
        // sebagai pendukung FK - drop index lama aman.
        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->dropUnique('override_office_unique');
        });

        DB::table('employee_attendance_location_override_offices')->update(['direction' => 'CHECK_IN']);

        $existingRows = DB::table('employee_attendance_location_override_offices')->get();
        foreach ($existingRows as $row) {
            DB::table('employee_attendance_location_override_offices')->insert([
                'employee_attendance_location_override_id' => $row->employee_attendance_location_override_id,
                'office_location_id' => $row->office_location_id,
                'direction' => 'CHECK_OUT',
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        DB::statement("ALTER TABLE employee_attendance_location_override_offices MODIFY direction ENUM('CHECK_IN','CHECK_OUT') NOT NULL");
    }

    public function down(): void
    {
        // Buang baris CHECK_OUT (duplikat dari migrasi ini) SEBELUM
        // balikin index lama - index lama (override_id, office_id) bakal
        // gagal dibuat kalau masih ada 2 baris office_id sama per override_id.
        DB::table('employee_attendance_location_override_offices')->where('direction', 'CHECK_OUT')->delete();

        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->unique(['employee_attendance_location_override_id', 'office_location_id'], 'override_office_unique');
        });

        // Index lama sudah balik jadi pendukung FK yang valid - index
        // composite baru aman didrop sekarang (urutan kebalikan dari up()).
        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->dropUnique('override_office_direction_unique');
        });

        Schema::table('employee_attendance_location_override_offices', function (Blueprint $table) {
            $table->dropColumn('direction');
        });
    }
};
