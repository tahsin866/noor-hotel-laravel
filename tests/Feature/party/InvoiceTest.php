<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\Role;
use App\Models\User;

function createInvoiceChallan(Party $party, int $quantity = 10, float $unitPrice = 100, float $vatRate = 10): Challan
{
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => $vatRate,
    ]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => $unitPrice,
    ]);
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
    ]);

    return $challan;
}

test('invoice update edits details and reattaches challans', function () {
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan1 = createInvoiceChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createInvoiceChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);

    $created = $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => 'original note',
        'challan_ids' => [$challan1->id],
    ]);
    $created->assertOk();
    $invoice = Invoice::query()->first();

    expect($invoice->total_amount)->toEqual(1100.0);
    expect($invoice->subtotal)->toEqual(1000.0);
    expect($invoice->total_vat)->toEqual(100.0);
    expect($invoice->challans->pluck('id')->all())->toBe([$challan1->id]);

    $response = $this->put("/api/invoices/{$invoice->id}", [
        'party_id' => $party->id,
        'date' => '2026-01-15',
        'due_date' => '2026-02-15',
        'notes' => 'updated note',
        'challan_ids' => [$challan1->id, $challan2->id],
    ]);

    $response->assertOk();
    expect($response->json('success'))->toBeTrue();

    $invoice->refresh();

    expect($invoice->date->format('Y-m-d'))->toBe('2026-01-15');
    expect($invoice->due_date->format('Y-m-d'))->toBe('2026-02-15');
    expect($invoice->notes)->toBe('updated note');
    expect($invoice->subtotal)->toEqual(2000.0);
    expect($invoice->total_vat)->toEqual(100.0);
    expect($invoice->total_amount)->toEqual(2100.0);
    expect($invoice->amount_due)->toEqual(2100.0);
    expect($invoice->status)->toBe('pending');
    expect($invoice->items->sum('total'))->toEqual(2100.0);
    expect($invoice->challans->pluck('id')->sort()->values()->all())->toBe([$challan1->id, $challan2->id]);
});

test('invoice update keeps payments and recomputes due amount', function () {
    $party = Party::factory()->create();
    $challan1 = createInvoiceChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createInvoiceChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan1->id],
    ])->assertOk();

    $invoice = Invoice::query()->first();
    $invoice->update([
        'amount_paid' => 500,
        'amount_due' => 600,
        'status' => 'partial',
    ]);
    PaymentHistory::factory()->create([
        'invoice_id' => $invoice->id,
        'amount' => 500,
        'payment_status' => 'partial',
    ]);

    $response = $this->put("/api/invoices/{$invoice->id}", [
        'party_id' => $party->id,
        'date' => '2026-01-15',
        'due_date' => '2026-02-15',
        'notes' => null,
        'challan_ids' => [$challan1->id, $challan2->id],
    ]);

    $response->assertOk();

    $invoice->refresh();

    expect($invoice->total_amount)->toEqual(2100.0);
    expect($invoice->amount_paid)->toEqual(500.0);
    expect($invoice->amount_due)->toEqual(1600.0);
    expect($invoice->status)->toBe('partial');
    expect($invoice->paymentHistory->count())->toBe(1);
});

test('invoice update reduces total and clamps paid amount', function () {
    $party = Party::factory()->create();
    $challan1 = createInvoiceChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createInvoiceChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan1->id, $challan2->id],
    ])->assertOk();

    $invoice = Invoice::query()->first();
    $invoice->update([
        'amount_paid' => 2500,
        'amount_due' => 0,
        'status' => 'paid',
    ]);

    $response = $this->put("/api/invoices/{$invoice->id}", [
        'party_id' => $party->id,
        'date' => '2026-01-15',
        'due_date' => '2026-02-15',
        'notes' => null,
        'challan_ids' => [$challan1->id],
    ]);

    $response->assertOk();

    $invoice->refresh();

    expect($invoice->total_amount)->toEqual(1100.0);
    expect($invoice->amount_paid)->toEqual(1100.0);
    expect($invoice->amount_due)->toEqual(0.0);
    expect($invoice->status)->toBe('paid');
});

test('invoice update requires challans and party', function () {
    $party = Party::factory()->create();
    $challan = createInvoiceChallan($party);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $invoice = Invoice::query()->first();

    $response = $this->put("/api/invoices/{$invoice->id}", [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [],
    ]);

    $response->assertStatus(422);
});

test('invoice index includes print status defaulting to unprinted', function () {
    Invoice::factory()->create();

    $response = $this->get('/api/invoices');

    $response->assertOk();
    expect($response->json('data.items.0.print_status'))->toBe('unprinted');
});

test('mark printed endpoint sets print status to printed', function () {
    $invoice = Invoice::factory()->create();

    $response = $this->post("/api/invoices/{$invoice->id}/mark-printed");

    $response->assertOk();
    expect($response->json('success'))->toBeTrue();
    expect($invoice->fresh()->print_status)->toBe('printed');
});

test('invoice index reflects printed status after marking', function () {
    $invoice = Invoice::factory()->create();
    $this->post("/api/invoices/{$invoice->id}/mark-printed")->assertOk();

    $response = $this->get('/api/invoices');

    $response->assertOk();
    expect($response->json('data.items.0.print_status'))->toBe('printed');
});

test('invoice items group identical meal lines across challans', function () {
    $party = Party::factory()->create(['party_name' => 'Split Items Client']);
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => 0,
    ]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'unit_price' => 28,
        'description' => 'Snacks Singara',
    ]);

    $challan1 = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan1->id,
        'product_meal_id' => $meal->id,
        'quantity' => 26,
        'unit_price' => 28,
    ]);

    $challan2 = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan2->id,
        'product_meal_id' => $meal->id,
        'quantity' => 30,
        'unit_price' => 28,
    ]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-11',
        'due_date' => '2026-02-11',
        'notes' => null,
        'challan_ids' => [$challan1->id, $challan2->id],
    ])->assertOk();

    $invoice = Invoice::query()->first();

    expect($invoice->items->count())->toBe(1);
    expect($invoice->items->pluck('quantity')->all())->toBe([56]);
    expect($invoice->items->pluck('description')->all())->toBe(['Snacks Singara']);

    $response = $this->get("/api/invoices/{$invoice->id}");
    $response->assertOk();

    $items = collect($response->json('data.items'))->values();
    expect($items)->toHaveCount(1);
    expect($items[0]['description'])->toBe('Snacks Singara');
    expect($items[0]['quantity'])->toBe(56);

    $this->get("/api/invoices/{$invoice->id}/print")->assertOk();
});

function actingAsInvoicePageUser($test): void
{
    $permission = Permission::firstOrCreate(['name' => 'manage_invoices']);
    $role = Role::firstOrCreate(['name' => 'test_invoice_creator']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $test->actingAs($user);
}

test('invoices page exposes only pending and delivered not-yet-invoiced challans', function () {
    actingAsInvoicePageUser($this);
    $party = Party::factory()->create(['party_name' => 'Pending Client']);
    $p1 = Product::factory()->create(['party_id' => $party->id]);
    $m1 = ProductMeal::factory()->create(['product_id' => $p1->id, 'meal_type' => 'lunch']);
    $p2 = Product::factory()->create(['party_id' => $party->id]);
    $m2 = ProductMeal::factory()->create(['product_id' => $p2->id, 'meal_type' => 'dinner']);

    $pending = Challan::factory()->create([
        'product_id' => $p1->id,
        'status' => 'pending',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $pending->id,
        'product_meal_id' => $m1->id,
        'quantity' => 10,
        'unit_price' => 100,
    ]);

    $delivered = Challan::factory()->create([
        'product_id' => $p2->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $delivered->id,
        'product_meal_id' => $m2->id,
        'quantity' => 5,
        'unit_price' => 100,
    ]);

    $invoiced = Challan::factory()->create([
        'product_id' => $p1->id,
        'status' => 'pending',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $invoiced->id,
        'product_meal_id' => $m1->id,
        'quantity' => 3,
        'unit_price' => 100,
    ]);
    $invoice = Invoice::factory()->create(['party_id' => $party->id]);
    $invoice->challans()->attach($invoiced->id);

    $response = $this->get('/invoices');

    $response->assertOk();

    $pageChallans = collect($response->viewData('page')['props']['challans'] ?? []);
    $ids = $pageChallans->pluck('id');

    expect($ids)->toContain($pending->id)
        ->toContain($delivered->id)
        ->not->toContain($invoiced->id);
});
