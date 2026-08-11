<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\Role;
use App\Models\User;
use App\Notifications\RecordCreated;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function adminUser(): User
{
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

function createDeliveredChallan(Party $party): Challan
{
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => 10,
    ]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => 100,
    ]);
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 10,
        'unit_price' => 100,
    ]);

    return $challan;
}

test('creating a party notifies admin users', function () {
    Notification::fake();

    $admin = adminUser();

    $this->post('/api/party', [
        'party_name' => 'Acme Traders',
        'party_type' => 'supplier',
    ])->assertCreated();

    Notification::assertSentTo($admin, RecordCreated::class, function ($notification) {
        return $notification->entity === 'party'
            && $notification->data['party_name'] === 'Acme Traders';
    });
});

test('creating a purchase order notifies admin users', function () {
    Notification::fake();

    $admin = adminUser();
    $party = Party::factory()->create();

    $this->post('/api/products', [
        'name' => 'Rice',
        'unit' => 'kg',
        'vat_rate' => 10,
        'party_id' => $party->id,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 10, 'unit_price' => 100, 'description' => ''],
        ],
    ])->assertCreated();

    Notification::assertSentTo($admin, RecordCreated::class, function ($notification) {
        return $notification->entity === 'purchase_order'
            && $notification->data['code'] === 'PO-0001'
            && $notification->data['amount'] === 1000.0;
    });
});

test('creating a challan notifies admin users', function () {
    Notification::fake();

    $admin = adminUser();
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => 100,
    ]);

    $this->post('/api/challans', [
        'product_id' => $product->id,
        'date' => '2026-08-01',
        'address' => 'Mirpur 10, Dhaka',
        'items' => [
            ['product_meal_id' => $meal->id, 'quantity' => 5],
        ],
    ])->assertOk();

    Notification::assertSentTo($admin, RecordCreated::class, function ($notification) {
        return $notification->entity === 'challan'
            && str_starts_with($notification->data['challan_number'], 'Noor/');
    });
});

test('creating an invoice notifies admin users', function () {
    Notification::fake();

    $admin = adminUser();
    $party = Party::factory()->create();
    $challan = createDeliveredChallan($party);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-08-01',
        'due_date' => '2026-09-01',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    Notification::assertSentTo($admin, RecordCreated::class, function ($notification) {
        return $notification->entity === 'invoice'
            && $notification->data['amount'] === 1100.0;
    });
});

test('recording a payment notifies admin users', function () {
    Notification::fake();

    $admin = adminUser();
    $party = Party::factory()->create();
    $challan = createDeliveredChallan($party);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-08-01',
        'due_date' => '2026-09-01',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $invoice = App\Models\Invoice::query()->first();

    $this->patch("/api/invoices/{$invoice->id}/status", [
        'status' => 'paid',
        'payment_method' => 'cash',
    ])->assertOk();

    Notification::assertSentTo($admin, RecordCreated::class, function ($notification) {
        return $notification->entity === 'payment'
            && $notification->data['amount'] === 1100.0;
    });
});

test('regular users are not notified when records are created', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/api/party', [
        'party_name' => 'Acme Traders',
        'party_type' => 'supplier',
    ])->assertCreated();

    Notification::assertNotSentTo($user, RecordCreated::class);
});
