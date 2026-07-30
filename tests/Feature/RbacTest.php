<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Leave;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_employee_ditolak_akses_dashboard(): void
    {
        $employee = Employee::factory()->withRole('EMPLOYEE')->create();

        $response = $this->actingAs($employee, 'sanctum')
            ->getJson('/api/dashboard/summary');

        $response->assertStatus(403);
    }

    public function test_super_admin_bypass_semua_permission(): void
    {
        $superAdmin = Employee::factory()->withRole('SUPER_ADMIN')->create();

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/dashboard/summary');

        $response->assertStatus(200);
    }

    public function test_employee_tidak_bisa_lihat_cuti_orang_lain(): void
    {
        $employeeA = Employee::factory()->withRole('EMPLOYEE')->create();
        $employeeB = Employee::factory()->withRole('EMPLOYEE')->create();

        $leaveOfB = Leave::create([
            'employee_id' => $employeeB->id,
            'leave_type' => 'Annual Leave',
            'start_date' => now()->addDays(5),
            'end_date' => now()->addDays(6),
            'total_days' => 2,
            'reason' => 'Test',
            'status' => 'Pending',
        ]);

        $response = $this->actingAs($employeeA, 'sanctum')
            ->getJson("/api/leaves/{$leaveOfB->id}");

        $response->assertStatus(403);
    }

    public function test_employee_tidak_bisa_ajukan_cuti_atas_nama_orang_lain(): void
    {
        $employeeA = Employee::factory()->withRole('EMPLOYEE')->create();
        $employeeB = Employee::factory()->withRole('EMPLOYEE')->create();

        $response = $this->actingAs($employeeA, 'sanctum')
            ->postJson('/api/leaves', [
                'employee_id' => $employeeB->id, // coba ngaku-ngaku jadi employeeB
                'leave_type' => 'Annual Leave',
                'start_date' => now()->addDays(5)->toDateString(),
                'end_date' => now()->addDays(6)->toDateString(),
                'reason' => 'Test',
            ]);

        $response->assertStatus(422);
    }
}
