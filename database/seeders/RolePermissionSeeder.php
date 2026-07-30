<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'manage_parties',
            'manage_products',
            'manage_challans',
            'manage_invoices',
            'manage_payments',
            'manage_users',
            'manage_roles',
            'view_dashboard',
            'print_challans',
            'dispatch_challans',
            'cancel_challans',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $allPermissions = Permission::all();

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin']);
        $superAdmin->permissions()->sync($allPermissions);

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->permissions()->sync($allPermissions);

        $moderator = Role::firstOrCreate(['name' => 'moderator']);
        $moderator->permissions()->sync($allPermissions->filter(fn ($p) => ! in_array($p->name, ['manage_users', 'manage_roles'])));

        $accountant = Role::firstOrCreate(['name' => 'accountant']);
        $accountant->permissions()->sync($allPermissions->filter(fn ($p) => in_array($p->name, [
            'view_dashboard',
            'manage_invoices',
            'manage_payments',
            'print_challans',
        ])));
    }
}
