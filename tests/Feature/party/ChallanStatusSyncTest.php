<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\Role;
use App\Models\User;

function createChallanSyncProduct(int $quantity = 100): Product
{
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'quantity' => 20,
        'unit_price' => 100,
        'delivered_quantity' => 0,
        'description' => 'Snack with Salad',
    ]);

    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'snacks',
        'quantity' => 20,
        'unit_price' => 150,
        'delivered_quantity' => 0,
        'description' => 'Snack with Beef',
    ]);

    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 20,
        'unit_price' => 200,
        'delivered_quantity' => 0,
        'description' => 'Lunch Item 1',
    ]);

    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => 20,
        'unit_price' => 200,
        'delivered_quantity' => 0,
        'description' => 'Lunch Item 2',
    ]);

    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'dinner',
        'quantity' => 20,
        'unit_price' => 250,
        'delivered_quantity' => 0,
        'description' => 'Dinner Item',
    ]);

    return $product;
}

function actingAsChallanSyncUser($test): void
{
    $permission = Permission::firstOrCreate(['name' => 'manage_challans']);
    $role = Role::firstOrCreate(['name' => 'test_challan_sync']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $test->actingAs($user);
}

test('returning delivered challan to pending decrements delivered_quantity', function () {
    actingAsChallanSyncUser($this);
    $product = createChallanSyncProduct(100);
    $meals = $product->meals()->get();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[0]->id,
        'quantity' => 10,
        'unit_price' => $meals[0]->unit_price,
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[2]->id,
        'quantity' => 10,
        'unit_price' => $meals[2]->unit_price,
    ]);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'delivered'])->assertOk();

    $meal0 = ProductMeal::find($meals[0]->id);
    $meal2 = ProductMeal::find($meals[2]->id);

    expect($meal0->delivered_quantity)->toBe(10);
    expect($meal2->delivered_quantity)->toBe(10);

    $response = $this->patchJson("/api/challans/{$challan->id}/status", [
        'status' => 'pending',
    ]);

    $response->assertOk();

    $meal0->refresh();
    $meal2->refresh();

    expect($meal0->delivered_quantity)->toBe(0);
    expect($meal2->delivered_quantity)->toBe(0);
    expect($challan->fresh()->status)->toBe('pending');
});

test('returning dispatched challan to pending decrements delivered_quantity', function () {
    actingAsChallanSyncUser($this);
    $product = createChallanSyncProduct(100);
    $meals = $product->meals()->get();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[1]->id,
        'quantity' => 15,
        'unit_price' => $meals[1]->unit_price,
    ]);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'dispatched'])->assertOk();

    $meal1 = ProductMeal::find($meals[1]->id);
    expect($meal1->delivered_quantity)->toBe(15);

    $response = $this->patchJson("/api/challans/{$challan->id}/status", [
        'status' => 'pending',
    ]);

    $response->assertOk();

    $meal1->refresh();
    expect($meal1->delivered_quantity)->toBe(0);
    expect($challan->fresh()->status)->toBe('pending');
});

test('transitioning delivered to dispatched does not change delivered_quantity', function () {
    actingAsChallanSyncUser($this);
    $product = createChallanSyncProduct(100);
    $meals = $product->meals()->get();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[3]->id,
        'quantity' => 20,
        'unit_price' => $meals[3]->unit_price,
    ]);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'delivered'])->assertOk();

    $meal3 = ProductMeal::find($meals[3]->id);
    expect($meal3->delivered_quantity)->toBe(20);

    $response = $this->patchJson("/api/challans/{$challan->id}/status", [
        'status' => 'dispatched',
    ]);

    $response->assertOk();

    $meal3->refresh();
    expect($meal3->delivered_quantity)->toBe(20);
    expect($challan->fresh()->status)->toBe('dispatched');
});

test('full round trip delivered -> dispatched -> pending restores delivered_quantity to zero', function () {
    actingAsChallanSyncUser($this);
    $product = createChallanSyncProduct(100);
    $meals = $product->meals()->get();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[0]->id,
        'quantity' => 5,
        'unit_price' => $meals[0]->unit_price,
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[4]->id,
        'quantity' => 8,
        'unit_price' => $meals[4]->unit_price,
    ]);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'delivered'])->assertOk();

    $meal0 = ProductMeal::find($meals[0]->id);
    $meal4 = ProductMeal::find($meals[4]->id);

    expect($meal0->delivered_quantity)->toBe(5);
    expect($meal4->delivered_quantity)->toBe(8);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'dispatched'])->assertOk();

    $meal0->refresh();
    $meal4->refresh();
    expect($meal0->delivered_quantity)->toBe(5);
    expect($meal4->delivered_quantity)->toBe(8);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'pending'])->assertOk();

    $meal0->refresh();
    $meal4->refresh();
    expect($meal0->delivered_quantity)->toBe(0);
    expect($meal4->delivered_quantity)->toBe(0);
    expect($challan->fresh()->status)->toBe('pending');
});

test('editing delivered challan syncs delivered_quantity correctly', function () {
    actingAsChallanSyncUser($this);
    $product = createChallanSyncProduct(100);
    $meals = $product->meals()->get();

    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => auth()->id(),
        'status' => 'pending',
    ]);

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meals[0]->id,
        'quantity' => 10,
        'unit_price' => $meals[0]->unit_price,
    ]);

    $this->patchJson("/api/challans/{$challan->id}/status", ['status' => 'delivered'])->assertOk();

    $meal0 = ProductMeal::find($meals[0]->id);
    expect($meal0->delivered_quantity)->toBe(10);

    $response = $this->putJson("/api/challans/{$challan->id}", [
        'product_id' => $product->id,
        'date' => now()->toDateString(),
        'address' => 'Test Address',
        'items' => [
            [
                'product_meal_id' => $meals[2]->id,
                'quantity' => 15,
            ],
        ],
    ]);

    $response->assertOk();

    $meal0->refresh();
    $meal2 = ProductMeal::find($meals[2]->id);

    expect($meal0->delivered_quantity)->toBe(0);
    expect($meal2->delivered_quantity)->toBe(15);
});
