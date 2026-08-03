<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tiap baris = 1 level approval dalam 1 workflow. Level 1, 2, 3, dst
     * dieksekusi BERURUTAN (sequential) - level N+1 gak bisa approve
     * sebelum level N selesai. Urutan ini yang jadi satu-satunya sumber
     * kebenaran soal "sekarang giliran siapa", jadi gak ada endpoint
     * yang bisa bypass urutan (approve() server-side selalu ambil level
     * yang lagi Pending saat ini, klien gak bisa "pilih" level manapun).
     */
    public function up(): void
    {
        Schema::create('approval_workflow_steps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('approval_workflow_id')
                ->constrained('approval_workflows')
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('level'); // 1, 2, 3, dst - urutan approval

            $table->foreignId('approver_role_id')
                ->constrained('roles')
                ->restrictOnDelete(); // role yang masih dipakai jadi approver gak boleh kehapus sembarangan

            $table->timestamps();

            $table->unique(['approval_workflow_id', 'level'], 'workflow_level_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_workflow_steps');
    }
};
