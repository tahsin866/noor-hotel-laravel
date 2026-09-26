<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

function createDeliveryProduct(int $quantity = 100, int $staleCounter = 40): array
{
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => $quantity,
        'unit_price' => 10,
        'delivered_quantity' => $staleCounter,
    ]);

    return [$product, $meal];
}

function createDeliveryChallan(Product $product, int $mealId, int $quantity, string $status = 'delivered'): Challan
{
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => $status,
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $mealId,
        'quantity' => $quantity,
    ]);

    return $challan;
}

test('po list delivered and remaining come from challan items, not the stale counter', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 100, staleCounter: 40);

    createDeliveryChallan($product, $meal->id, 50);
    createDeliveryChallan($product, $meal->id, 25);

    $response = $this->get('/api/products');

    $response->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);

    expect($item['total_ordered'])->toBe(100);
    expect($item['total_delivered'])->toBe(75);
    expect($item['meals'][0]['delivered_quantity'])->toBe(75);
});

test('po list counts pending and dispatched challan items as delivered', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 100, staleCounter: 0);

    createDeliveryChallan($product, $meal->id, 30, 'pending');
    createDeliveryChallan($product, $meal->id, 20, 'dispatched');
    createDeliveryChallan($product, $meal->id, 5, 'delivered');

    $response = $this->get('/api/products');

    $response->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);
    expect($item['total_delivered'])->toBe(55);
});

test('po list excludes cancelled and deleted challans from delivered', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 100, staleCounter: 0);

    createDeliveryChallan($product, $meal->id, 10, 'cancelled');
    $deleted = createDeliveryChallan($product, $meal->id, 15, 'delivered');
    $deleted->delete();

    $response = $this->get('/api/products');

    $response->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);
    expect($item['total_delivered'])->toBe(0);
});

test('product show exposes delivered per meal from challan items', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 60, staleCounter: 10);

    createDeliveryChallan($product, $meal->id, 45);

    $response = $this->get("/api/products/{$product->id}");

    $response->assertOk();
    $data = $response->json();
    expect($data['total_delivered'])->toBe(45);
    expect($data['meals'][0]['delivered_quantity'])->toBe(45);
});

test('product show exposes meals subtotal and total', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 60, staleCounter: 10);
    $product->update(['vat_rate' => 5]);

    createDeliveryChallan($product, $meal->id, 45);

    $response = $this->get("/api/products/{$product->id}");

    $response->assertOk();
    $data = $response->json();
    expect($data['meals_subtotal'])->toBe(600);
    expect($data['meals_total'])->toBe(630);
});

test('po totals and meal numbers are serialised as json numbers, not strings', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 60, staleCounter: 10);

    createDeliveryChallan($product, $meal->id, 45);

    $list = $this->get('/api/products')->assertOk();
    $listItem = collect($list->json('items'))->firstWhere('id', $product->id);
    expect($listItem['total_ordered'])->toBeInt();
    expect($listItem['total_delivered'])->toBeInt();

    $show = $this->get("/api/products/{$product->id}")->assertOk();
    $data = $show->json();
    expect($data['meals'][0]['quantity'])->toBeNumeric()->not->toBeString();
    expect($data['meals'][0]['delivered_quantity'])->toBeNumeric()->not->toBeString();
    expect($data['meals'][0]['unit_price'])->toBeNumeric()->not->toBeString();
    expect($data['meals_subtotal'])->toBeNumeric()->not->toBeString();
    expect($data['meals_total'])->toBeNumeric()->not->toBeString();
});

test('po list remaining is derived per meal so a short row is not hidden by over delivery elsewhere', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $short = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'quantity' => 180,
        'unit_price' => 10,
    ]);
    $over = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 100,
        'unit_price' => 10,
    ]);

    createDeliveryChallan($product, $short->id, 60);
    createDeliveryChallan($product, $over->id, 220);

    $response = $this->get("/api/products/{$product->id}")->assertOk();
    $data = $response->json();
    $meals = collect($data['meals'])->keyBy('id');

    expect($meals[$short->id]['delivered_quantity'])->toBe(60);
    expect($meals[$short->id]['remaining'])->toBe(120);
    expect($meals[$short->id]['over_delivered'])->toBe(0);
    expect($meals[$over->id]['delivered_quantity'])->toBe(220);
    expect($meals[$over->id]['remaining'])->toBe(0);
    expect($meals[$over->id]['over_delivered'])->toBe(120);

    expect($data['total_ordered'])->toBe(280);
    expect($data['total_delivered'])->toBe(280);
    expect($data['total_remaining'])->toBe(120);
    expect($data['total_over_delivered'])->toBe(120);
});

test('po list exposes remaining and over delivered totals', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    $short = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'quantity' => 180,
        'unit_price' => 10,
    ]);
    $over = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'quantity' => 100,
        'unit_price' => 10,
    ]);

    createDeliveryChallan($product, $short->id, 60);
    createDeliveryChallan($product, $over->id, 220);

    $response = $this->get('/api/products')->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);

    expect($item['total_ordered'])->toBe(280);
    expect($item['total_delivered'])->toBe(280);
    expect($item['total_remaining'])->toBe(120);
    expect($item['total_over_delivered'])->toBe(120);
});

test('fully delivered po reports no remaining and no over delivery', function () {
    [$product, $meal] = createDeliveryProduct(quantity: 100, staleCounter: 0);

    createDeliveryChallan($product, $meal->id, 100);

    $response = $this->get('/api/products')->assertOk();
    $item = collect($response->json('items'))->firstWhere('id', $product->id);

    expect($item['total_remaining'])->toBe(0);
    expect($item['total_over_delivered'])->toBe(0);
});