<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

/**
 * The PO table merges the store/update response into its row, so those
 * endpoints must carry the same aggregates the list endpoint returns.
 * Otherwise editing a PO blanks Ordered, Delivered and the status badge
 * until the page is refreshed.
 */
function updateAggregatesProduct(): array
{
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $product = Product::factory()->create(['party_id' => $party->id]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 100,
        'unit_price' => 10,
    ]);

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 40,
    ]);

    return [$product, $meal, $challan];
}

function updateAggregatesPayload(Product $product, array $meals): array
{
    return [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'party_id' => $product->party_id,
        'meals' => $meals,
    ];
}

test('update response keeps the ordered delivered and remaining totals the table renders', function () {
    [$product, $meal] = updateAggregatesProduct();

    $response = $this->put("/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]));

    $response->assertOk();
    $data = $response->json('product');

    expect($data['total_ordered'])->toBe(120);
    expect($data['total_delivered'])->toBe(40);
    expect($data['total_remaining'])->toBe(80);
    expect($data['total_over_delivered'])->toBe(0);
});

test('update response carries the challan counts the status badge depends on', function () {
    [$product, $meal, $challan] = updateAggregatesProduct();

    $invoiced = $this->put("/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]))->assertOk()->json('product');

    expect($invoiced['challans_count'])->toBe(1);
    expect($invoiced['invoiced_challans_count'])->toBe(0);

    $challan->invoices()->attach(Invoice::factory()->create()->id);

    $invoiced = $this->put("/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]))->assertOk()->json('product');

    expect($invoiced['challans_count'])->toBe(1);
    expect($invoiced['invoiced_challans_count'])->toBe(1);
});

test('update response totals match the list endpoint for the same product', function () {
    [$product, $meal] = updateAggregatesProduct();

    $this->put("/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]))->assertOk();

    $updated = $this->json('PUT', "/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]))->json('product');

    $listed = collect($this->get('/api/products')->json('items'))
        ->firstWhere('id', $product->id);

    foreach (['total_ordered', 'total_delivered', 'total_remaining', 'total_over_delivered', 'challans_count', 'invoiced_challans_count'] as $key) {
        expect($updated[$key])->toBe($listed[$key], "{$key} differs between update and list");
    }
});

test('store response carries the same aggregates so a new row is not blank', function () {
    $party = Party::factory()->create(['party_name' => 'Beta Supplies']);

    $created = $this->post('/api/products', [
        'name' => 'Fresh Order',
        'unit' => 'pcs',
        'vat_rate' => 10,
        'party_id' => $party->id,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 30, 'unit_price' => 100, 'description' => ''],
        ],
    ])->assertCreated()->json('product');

    expect($created['total_ordered'])->toBe(30);
    expect($created['total_delivered'])->toBe(0);
    expect($created['challans_count'])->toBe(0);
    expect($created['invoiced_challans_count'])->toBe(0);
    expect($created['party_name'])->toBe('Beta Supplies');
});

test('every product endpoint resolves party name so the table party column never blanks', function () {
    [$product, $meal] = updateAggregatesProduct();

    $listed = collect($this->get('/api/products')->json('items'))
        ->firstWhere('id', $product->id);
    $updated = $this->put("/api/products/{$product->id}", updateAggregatesPayload($product, [
        ['id' => $meal->id, 'meal_type' => 'lunch', 'quantity' => 120, 'unit_price' => 10],
    ]))->assertOk()->json('product');
    $shown = $this->get("/api/products/{$product->id}")->assertOk()->json();

    foreach (['list' => $listed, 'update' => $updated, 'show' => $shown] as $endpoint => $data) {
        expect($data['party_name'])->toBe('Alpha Traders', "party_name missing on {$endpoint}");
    }
});

test('a product without a party reports a null party name instead of erroring', function () {
    $product = Product::factory()->create(['party_id' => null]);

    $listed = collect($this->get('/api/products')->json('items'))
        ->firstWhere('id', $product->id);

    expect($listed['party_name'])->toBeNull();
});
