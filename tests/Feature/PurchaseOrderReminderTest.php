<?php

use App\Console\Commands\ProcessPurchaseOrderReminders;
use App\Models\Party;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Notifications\PurchaseOrderReminder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('due reminders notify admin users once and mark the product', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    $superAdmin = User::factory()->create();
    $superAdmin->roles()->attach(Role::where('name', 'super_admin')->first());

    $regular = User::factory()->create();

    $product = Product::factory()->create([
        'reminder_at' => now()->subMinute(),
    ]);

    $this->artisan(ProcessPurchaseOrderReminders::class)->assertSuccessful();

    Notification::assertSentTo($admin, PurchaseOrderReminder::class);
    Notification::assertSentTo($superAdmin, PurchaseOrderReminder::class);
    Notification::assertNotSentTo($regular, PurchaseOrderReminder::class);

    expect($product->fresh()->reminder_notified_at)->not->toBeNull();

    $this->artisan(ProcessPurchaseOrderReminders::class)->assertSuccessful();

    Notification::assertSentToTimes($admin, PurchaseOrderReminder::class, 1);
    Notification::assertSentToTimes($superAdmin, PurchaseOrderReminder::class, 1);
});

test('future reminders do not notify admins', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    Product::factory()->create([
        'reminder_at' => now()->addDay(),
    ]);

    $this->artisan(ProcessPurchaseOrderReminders::class)->assertSuccessful();

    Notification::assertNothingSent();
    expect(Product::query()->first()->reminder_notified_at)->toBeNull();
});

test('products without a reminder are ignored', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    Product::factory()->create();

    $this->artisan(ProcessPurchaseOrderReminders::class)->assertSuccessful();

    Notification::assertNothingSent();
});

test('product store persists the reminder time', function () {
    $party = Party::factory()->create();

    $this->post('/api/products', [
        'name' => 'Test Product',
        'unit' => 'pcs',
        'vat_rate' => 10,
        'party_id' => $party->id,
        'reminder_at' => '2026-08-20T09:30:00.000Z',
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
    ])->assertCreated();

    $product = Product::query()->first();

    expect($product->reminder_at)->not->toBeNull();
    expect($product->reminder_at->toIso8601String())->toBe('2026-08-20T09:30:00+00:00');
});

test('product update persists the reminder time', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'reminder_at' => '2026-08-21T14:00:00.000Z',
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
    ])->assertOk();

    $product->refresh();

    expect($product->reminder_at->toIso8601String())->toBe('2026-08-21T14:00:00+00:00');
});

test('product store accepts a null reminder', function () {
    $party = Party::factory()->create();

    $this->post('/api/products', [
        'name' => 'Test Product',
        'unit' => 'pcs',
        'vat_rate' => 10,
        'party_id' => $party->id,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
    ])->assertCreated();

    expect(Product::query()->first()->reminder_at)->toBeNull();
});
