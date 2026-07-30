<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('super admin can access admin roles page', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $response = $this->actingAs($superAdmin)->get('/admin/roles');

    $response->assertOk();
});

test('non admin cannot access admin roles page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/admin/roles');

    $response->assertForbidden();
});

test('super admin can create role', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $response = $this->actingAs($superAdmin)->post('/admin/roles', [
        'name' => 'editor',
        'permissions' => [1],
    ]);

    $response->assertSessionHas('success');
    $this->assertDatabaseHas('roles', ['name' => 'editor']);
});

test('super admin can update role', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $role = Role::where('name', 'admin')->first();

    $response = $this->actingAs($superAdmin)->put("/admin/roles/{$role->id}", [
        'name' => 'super_admin_updated',
        'permissions' => [1, 2],
    ]);

    $response->assertSessionHas('success');
    $this->assertDatabaseHas('roles', ['name' => 'super_admin_updated']);
});

test('super admin can delete role', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $role = Role::create(['name' => 'temp_role', 'guard' => 'web']);

    $response = $this->actingAs($superAdmin)->delete("/admin/roles/{$role->id}");

    $response->assertSessionHas('success');
    $this->assertDatabaseMissing('roles', ['name' => 'temp_role']);
});

test('super admin can access admin permissions page', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $response = $this->actingAs($superAdmin)->get('/admin/permissions');

    $response->assertOk();
});

test('non admin cannot access admin permissions page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/admin/permissions');

    $response->assertForbidden();
});

test('super admin can create permission', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $response = $this->actingAs($superAdmin)->post('/admin/permissions', [
        'name' => 'new_permission',
    ]);

    $response->assertSessionHas('success');
    $this->assertDatabaseHas('permissions', ['name' => 'new_permission']);
});

test('super admin can delete permission', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $perm = Permission::create(['name' => 'delete_me', 'guard' => 'web']);

    $response = $this->actingAs($superAdmin)->delete("/admin/permissions/{$perm->id}");

    $response->assertSessionHas('success');
    $this->assertDatabaseMissing('permissions', ['name' => 'delete_me']);
});

test('role permission seeder creates expected roles and permissions', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(Role::count())->toBe(4);
    expect(Permission::count())->toBe(11);

    $superAdmin = Role::where('name', 'super_admin')->first();
    expect($superAdmin->permissions()->count())->toBe(11);

    $moderator = Role::where('name', 'moderator')->first();
    expect($moderator->permissions()->count())->toBe(9);

    $accountant = Role::where('name', 'accountant')->first();
    expect($accountant->permissions()->count())->toBe(4);
});
