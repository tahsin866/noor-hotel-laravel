<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

function createPoProduct(Party $party): Product
{
    return Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => 10,
    ]);
}

function createPoChallan(Product $product, string $status = 'delivered'): Challan
{
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 10,
        'unit_price' => 100,
    ]);
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => $status,
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 10,
        'unit_price' => 100,
    ]);

    return $challan;
}

function poStatusCodes(array $items): array
{
    return collect($items)->pluck('code')->all();
}

function createPoInvoice($test, Party $party, Challan $challan): void
{
    $test->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan->id],
    ])->assertOk();
}

test('product index returns challan and invoiced challan counts', function () {
    $party = Party::factory()->create();
    $product = createPoProduct($party);

    $response = $this->get('/api/products');

    $response->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);
    expect($item['challans_count'])->toBe(0);
    expect($item['invoiced_challans_count'])->toBe(0);
});

test('product without challan appears under waiting for challan filter', function () {
    $party = Party::factory()->create();
    $noChallan = createPoProduct($party);
    $hasChallan = createPoProduct($party);
    createPoChallan($hasChallan);

    $response = $this->get('/api/products?status=pending');

    $response->assertOk();
    $codes = poStatusCodes($response->json('items'));
    expect($codes)->toContain($noChallan->code);
    expect($codes)->not->toContain($hasChallan->code);
});

test('product with challan but no invoice appears under waiting for invoice filter', function () {
    $party = Party::factory()->create();
    $hasChallan = createPoProduct($party);
    createPoChallan($hasChallan);
    $invoiced = createPoProduct($party);
    $challan = createPoChallan($invoiced);
    createPoInvoice($this, $party, $challan);

    $response = $this->get('/api/products?status=waiting');

    $response->assertOk();
    $codes = poStatusCodes($response->json('items'));
    expect($codes)->toContain($hasChallan->code);
    expect($codes)->not->toContain($invoiced->code);
});

test('product with invoiced challan appears under delivered filter', function () {
    $party = Party::factory()->create();
    $hasChallan = createPoProduct($party);
    createPoChallan($hasChallan);
    $invoiced = createPoProduct($party);
    $challan = createPoChallan($invoiced);
    createPoInvoice($this, $party, $challan);

    $response = $this->get('/api/products?status=delivered');

    $response->assertOk();
    $codes = poStatusCodes($response->json('items'));
    expect($codes)->toContain($invoiced->code);
    expect($codes)->not->toContain($hasChallan->code);
});

test('cancelled challan does not count toward delivery status', function () {
    $party = Party::factory()->create();
    $product = createPoProduct($party);
    createPoChallan($product, 'cancelled');

    $response = $this->get('/api/products');

    $response->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);
    expect($item['challans_count'])->toBe(0);
    expect($item['invoiced_challans_count'])->toBe(0);

    $pending = $this->get('/api/products?status=pending');

    expect($pending->json('items'))->toHaveCount(1);
});
