<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

test('invoice line price follows the current purchase order price', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id, 'vat_rate' => 0]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => 440,
        'description' => 'Menu 04',
    ]);

    $challan = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 72,
        'unit_price' => 500,
    ]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $invoice = Invoice::query()->firstOrFail();

    expect((float) $invoice->items->first()->unit_price)->toEqual(440.0);
    expect((float) $invoice->items->first()->total)->toEqual(31680.0);
    expect((float) $invoice->total_amount)->toEqual(31680.0);
});

test('rebuilding an invoice re-prices its items from the purchase order', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id, 'vat_rate' => 0]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'unit_price' => 100,
        'description' => 'Chicken Patties',
    ]);

    $challan = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 96,
        'unit_price' => 100,
    ]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $invoice = Invoice::query()->firstOrFail();
    expect((float) $invoice->total_amount)->toEqual(9600.0);

    $meal->update(['unit_price' => 500]);

    $this->artisan('invoices:rebuild-items --apply')->assertSuccessful();

    $invoice->refresh();
    expect((float) $invoice->items->first()->unit_price)->toEqual(500.0);
    expect((float) $invoice->total_amount)->toEqual(48000.0);
    expect((float) $invoice->amount_due)->toEqual(48000.0);
});

test('rebuild command only reports changes without --apply', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id, 'vat_rate' => 0]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => 440,
    ]);

    $challan = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 10,
        'unit_price' => 500,
    ]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $meal->update(['unit_price' => 500]);

    $this->artisan('invoices:rebuild-items')
        ->expectsOutputToContain('would change')
        ->assertSuccessful();

    $invoice = Invoice::query()->firstOrFail();
    expect((float) $invoice->items->first()->unit_price)->toEqual(440.0);
});

test('updating a purchase order keeps meal prices on their own rows when rows are reordered', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $lunch = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 96,
        'unit_price' => 440,
        'description' => 'Menu 04',
    ]);
    $snacks = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'quantity' => 60,
        'unit_price' => 100,
        'description' => 'Chicken Patties',
    ]);

    $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            [
                'id' => $snacks->id,
                'meal_type' => 'snacks',
                'quantity' => 60,
                'unit_price' => 100,
                'description' => 'Chicken Patties',
            ],
            [
                'id' => $lunch->id,
                'meal_type' => 'lunch',
                'quantity' => 96,
                'unit_price' => 440,
                'description' => 'Menu 04',
            ],
        ],
    ])->assertOk();

    expect((float) $lunch->fresh()->unit_price)->toEqual(440.0);
    expect((float) $snacks->fresh()->unit_price)->toEqual(100.0);
    expect((int) $lunch->fresh()->quantity)->toEqual(96);
    expect((int) $snacks->fresh()->quantity)->toEqual(60);
});

test('updating a purchase order deletes meals that are no longer submitted', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $keep = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => 440,
    ]);
    $remove = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => 100,
    ]);

    $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            [
                'id' => $keep->id,
                'meal_type' => $keep->meal_type,
                'quantity' => $keep->quantity,
                'unit_price' => 440,
                'description' => $keep->description,
            ],
        ],
    ])->assertOk();

    expect($product->meals()->pluck('id')->all())->toBe([$keep->id]);
});

test('meal rows submitted without an id are created as new rows', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $existing = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => 440,
    ]);

    $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            ['meal_type' => 'snacks', 'quantity' => 10, 'unit_price' => 100, 'description' => 'New row'],
        ],
    ])->assertOk();

    expect($existing->fresh())->toBeNull();
    expect($product->meals()->count())->toEqual(1);
    expect((float) $product->meals()->first()->unit_price)->toEqual(100.0);
});
