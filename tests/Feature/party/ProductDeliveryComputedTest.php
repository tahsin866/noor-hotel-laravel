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