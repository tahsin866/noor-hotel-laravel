<?php

use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

beforeEach(function () {
    Party::factory()->count(3)->create();
});

test('purchase report endpoint returns success with data', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);
    ProductMeal::factory()->count(2)->create(['product_id' => $product->id]);

    $response = $this->get('/api/reports/purchase');

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ])
        ->assertJsonStructure([
            'success',
            'data' => [
                'rows' => [
                    '*' => [
                        'id',
                        'code',
                        'name',
                        'party_id',
                        'party_name',
                        'customer_po_number',
                        'unit',
                        'vat_rate',
                        'total_ordered',
                        'total_delivered',
                        'remaining',
                        'subtotal',
                        'vat',
                        'total',
                        'status',
                    ],
                ],
                'summary' => [
                    'total_orders',
                    'total_ordered',
                    'total_delivered',
                    'total_remaining',
                    'total_subtotal',
                    'total_vat',
                    'total_amount',
                ],
            ],
        ]);
});

test('purchase report filters by party', function () {
    $partyA = Party::factory()->create();
    $partyB = Party::factory()->create();

    $productA = Product::factory()->create(['party_id' => $partyA->id]);
    $productB = Product::factory()->create(['party_id' => $partyB->id]);

    ProductMeal::factory()->create(['product_id' => $productA->id]);
    ProductMeal::factory()->create(['product_id' => $productB->id]);

    $response = $this->get("/api/reports/purchase?party_id={$partyA->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_id'])->toBe($partyA->id);
});

test('purchase report filters by status delivered', function () {
    $party = Party::factory()->create();
    $productDelivered = Product::factory()->create(['party_id' => $party->id]);
    $productPending = Product::factory()->create(['party_id' => $party->id]);

    ProductMeal::factory()->create([
        'product_id' => $productDelivered->id,
        'quantity' => 10,
        'delivered_quantity' => 10,
    ]);
    ProductMeal::factory()->create([
        'product_id' => $productPending->id,
        'quantity' => 10,
        'delivered_quantity' => 0,
    ]);

    $response = $this->get('/api/reports/purchase?status=delivered');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['id'])->toBe($productDelivered->id);
});

test('purchase report filters by status partial', function () {
    $party = Party::factory()->create();
    $productPartial = Product::factory()->create(['party_id' => $party->id]);
    $productPending = Product::factory()->create(['party_id' => $party->id]);

    ProductMeal::factory()->create([
        'product_id' => $productPartial->id,
        'quantity' => 10,
        'delivered_quantity' => 5,
    ]);
    ProductMeal::factory()->create([
        'product_id' => $productPending->id,
        'quantity' => 10,
        'delivered_quantity' => 0,
    ]);

    $response = $this->get('/api/reports/purchase?status=partial');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['id'])->toBe($productPartial->id);
});

test('purchase report filters by status pending', function () {
    $party = Party::factory()->create();
    $productPending = Product::factory()->create(['party_id' => $party->id]);
    $productDelivered = Product::factory()->create(['party_id' => $party->id]);

    ProductMeal::factory()->create([
        'product_id' => $productPending->id,
        'quantity' => 10,
        'delivered_quantity' => 0,
    ]);
    ProductMeal::factory()->create([
        'product_id' => $productDelivered->id,
        'quantity' => 10,
        'delivered_quantity' => 10,
    ]);

    $response = $this->get('/api/reports/purchase?status=pending');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['id'])->toBe($productPending->id);
});

test('purchase report searches by code name or party', function () {
    $party = Party::factory()->create(['party_name' => 'Acme Supplies']);
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'name' => 'Widgets',
        'code' => 'PO-0001',
    ]);
    ProductMeal::factory()->create(['product_id' => $product->id]);

    $response = $this->get('/api/reports/purchase?search=Acme');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_name'])->toBe('Acme Supplies');
});

test('purchase report summary calculates correctly', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id, 'vat_rate' => 10]);
    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'quantity' => 10,
        'unit_price' => 100,
        'delivered_quantity' => 5,
    ]);

    $response = $this->get('/api/reports/purchase');

    $response->assertOk();
    $summary = $response->json('data.summary');
    expect($summary['total_orders'])->toBe(1);
    expect($summary['total_ordered'])->toBe(10);
    expect($summary['total_delivered'])->toBe(5);
    expect($summary['total_remaining'])->toBe(5);
    expect($summary['total_subtotal'])->toBe(1000);
    expect($summary['total_vat'])->toBe(100);
    expect($summary['total_amount'])->toBe(1100);
});
