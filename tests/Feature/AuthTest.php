<?php

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(); // Department, Position, Role, WorkShift, OfficeLocation, Permission, RolePermission
    }

    public function test_login_berhasil_dengan_kredensial_benar(): void
    {
        $employee = Employee::factory()->create([
            'email' => 'test@myjap.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@myjap.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => ['access_token', 'token_type', 'employee']]);
    }

    public function test_login_gagal_dengan_password_salah(): void
    {
        Employee::factory()->create([
            'email' => 'test@myjap.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@myjap.com',
            'password' => 'password_salah',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_login_gagal_tercatat_di_audit_log(): void
    {
        $this->postJson('/api/login', [
            'email' => 'tidak-ada@myjap.com',
            'password' => 'apapun',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'failed_login',
        ]);
    }

    public function test_endpoint_terproteksi_menolak_request_tanpa_token(): void
    {
        $response = $this->getJson('/api/employees');

        $response->assertStatus(401);
    }
}
