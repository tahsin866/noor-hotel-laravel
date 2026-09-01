<?php

use App\Models\Challan;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\User;

function createChallanPrintProduct(): Product
{
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $product = Product::factory()->create(['party_id' => $party->id]);
    ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => 100,
    ]);

    return $product;
}

function actingAsChallanUser($test): void
{
    $test->actingAs(User::factory()->create());
}

test('creating a challan persists show_print_date false', function () {
    actingAsChallanUser($this);
    $product = createChallanPrintProduct();
    $meal = $product->meals()->first();

    $this->post('/api/challans', [
        'product_id' => $product->id,
        'date' => '2026-01-10',
        'address' => '123 Main Street',
        'notes' => null,
        'show_print_date' => false,
        'items' => [[
            'product_meal_id' => $meal->id,
            'quantity' => 5,
        ]],
    ])->assertSuccessful();

    $challan = Challan::query()->first();

    expect($challan->show_print_date)->toBeFalse();
});

test('creating a challan defaults show_print_date to true', function () {
    actingAsChallanUser($this);
    $product = createChallanPrintProduct();
    $meal = $product->meals()->first();

    $this->post('/api/challans', [
        'product_id' => $product->id,
        'date' => '2026-01-10',
        'address' => '123 Main Street',
        'notes' => null,
        'items' => [[
            'product_meal_id' => $meal->id,
            'quantity' => 5,
        ]],
    ])->assertSuccessful();

    $challan = Challan::query()->first();

    expect($challan->show_print_date)->toBeTrue();
});

test('updating a challan persists show_print_date', function () {
    actingAsChallanUser($this);
    $product = createChallanPrintProduct();
    $meal = $product->meals()->first();
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'date' => '2026-01-10',
        'status' => 'pending',
    ]);

    $this->put("/api/challans/{$challan->id}", [
        'product_id' => $product->id,
        'date' => '2026-01-10',
        'address' => '123 Main Street',
        'notes' => null,
        'show_print_date' => false,
        'items' => [[
            'product_meal_id' => $meal->id,
            'quantity' => 5,
        ]],
    ])->assertSuccessful();

    expect($challan->fresh()->show_print_date)->toBeFalse();
});

test('challan show returns show_print_date', function () {
    $product = createChallanPrintProduct();
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'date' => '2026-01-10',
        'show_print_date' => false,
        'status' => 'pending',
    ]);

    $response = $this->get("/api/challans/{$challan->id}");

    $response->assertSuccessful();
    expect($response->json('data.show_print_date'))->toBeFalse();
});
