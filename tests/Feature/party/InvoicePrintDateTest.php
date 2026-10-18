<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\User;

function createInvoicePrintChallan(Party $party): Challan
{
    $product = Product::factory()->create(['party_id' => $party->id]);
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
        'quantity' => 5,
        'unit_price' => 100,
    ]);

    return $challan;
}

function actingAsInvoiceUser($test): void
{
    $test->actingAs(User::factory()->create());
}

test('creating an invoice persists show_print_date false', function () {
    actingAsInvoiceUser($this);
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicePrintChallan($party);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'show_print_date' => false,
        'challan_ids' => [$challan->id],
    ])->assertSuccessful();

    $invoice = Invoice::query()->first();

    expect($invoice->show_print_date)->toBeFalse();
});

test('creating an invoice defaults show_print_date to true', function () {
    actingAsInvoiceUser($this);
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicePrintChallan($party);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan->id],
    ])->assertSuccessful();

    $invoice = Invoice::query()->first();

    expect($invoice->show_print_date)->toBeTrue();
});

test('updating an invoice persists show_print_date', function () {
    actingAsInvoiceUser($this);
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicePrintChallan($party);

    $created = $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan->id],
    ]);
    $created->assertOk();

    $invoice = Invoice::query()->first();

    $this->put("/api/invoices/{$invoice->id}", [
        'party_id' => $party->id,
        'date' => '2026-01-15',
        'due_date' => '2026-02-15',
        'notes' => null,
        'show_print_date' => false,
        'challan_ids' => [$challan->id],
    ])->assertSuccessful();

    expect($invoice->fresh()->show_print_date)->toBeFalse();
});

test('invoice show returns show_print_date', function () {
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicePrintChallan($party);

    $invoice = Invoice::factory()->create([
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'show_print_date' => false,
        'status' => 'pending',
    ]);
    $invoice->challans()->attach($challan->id);

    $response = $this->get("/api/invoices/{$invoice->id}");

    $response->assertSuccessful();
    expect($response->json('data.show_print_date'))->toBeFalse();
});
