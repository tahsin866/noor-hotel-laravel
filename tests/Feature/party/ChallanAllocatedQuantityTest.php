<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\Role;
use App\Models\User;

function createChallanAllocationProduct(int $quantity = 50): Product
{
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);
    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => $quantity,
        'unit_price' => 100,
    ]);

    return $product;
}

function actingAsChallanPageUser($test): void
{
    $permission = Permission::firstOrCreate(['name' => 'manage_challans']);
    $role = Role::firstOrCreate(['name' => 'test_challan_allocator']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $test->actingAs($user);
}

test('the chalans page exposes allocated_quantity counting pending challans', function () {
    actingAsChallanPageUser($this);
    $product = createChallanAllocationProduct(50);
    $meal = $product->meals()->first();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 20,
        'unit_price' => 100,
    ]);

    $response = $this->get('/chalans');

    $response->assertOk()->assertInertia(function ($page) use ($meal) {
        $page->component('noor-hotel/chalans');
        $meals = collect($page->toArray()['props']['products'])
            ->flatMap(fn ($p) => $p['meals'])
            ->all();
        $mealPayload = collect($meals)->firstWhere('id', $meal->id);

        expect($mealPayload['allocated_quantity'])->toBe(20);
    });
});

test('allocated_quantity excludes cancelled challans', function () {
    actingAsChallanPageUser($this);
    $product = createChallanAllocationProduct(50);
    $meal = $product->meals()->first();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'cancelled',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 20,
        'unit_price' => 100,
    ]);

    $response = $this->get('/chalans');

    $response->assertOk()->assertInertia(function ($page) use ($meal) {
        $mealPayload = collect($page->toArray()['props']['products'])
            ->flatMap(fn ($p) => $p['meals'])
            ->firstWhere('id', $meal->id);

        expect($mealPayload['allocated_quantity'])->toBe(0);
    });
});

test('summary challan aggregates items and generates next serial', function () {
    actingAsChallanPageUser($this);
    $product = createChallanAllocationProduct(50);
    $meal = $product->meals()->first();

    $meal->description = 'Biscuit (1 Pack) 60 to 80 Gram';
    $meal->save();

    $makeChallan = function (string $serial, string $status, int $qty, bool $deleted = false) use ($product, $meal) {
        $challan = Challan::factory()->create([
            'challan_number' => $serial,
            'product_id' => $product->id,
            'user_id' => auth()->id(),
            'status' => $status,
        ]);

        if ($deleted) {
            $challan->delete();
        }

        ChallanItem::factory()->create([
            'challan_id' => $challan->id,
            'product_meal_id' => $meal->id,
            'quantity' => $qty,
            'unit_price' => 100,
        ]);
    };

    $makeChallan('Noor/2026/CH/1073', 'pending', 10);
    $makeChallan('Noor/2026/CH/1074', 'delivered', 5);
    $makeChallan('Noor/2026/CH/1075', 'cancelled', 20);
    $makeChallan('Noor/2026/CH/1076', 'pending', 7, deleted: true);

    $response = $this->get('/api/products/'.$product->id.'/summary-challan');

    $response->assertOk();

    $data = $response->json('data');
    expect($data['ref'])->toBe('Noor/2026/CH/1077')
        ->and($data['client'])->toBe($product->party->party_name)
        ->and($data['items'])->toHaveCount(2)
        ->and($data['items'][0]['quantity'])->toBe(10)
        ->and($data['items'][1]['quantity'])->toBe(5)
        ->and($data['items'][0]['description'])->toContain('Biscuit');
});
