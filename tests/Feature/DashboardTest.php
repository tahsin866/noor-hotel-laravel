<?php

use App\Models\Challan;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard revenue and due exclude pending and cancelled challans', function () {
    $user = User::factory()->create();
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered', 'total_amount' => 3000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'dispatched', 'total_amount' => 2000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'pending', 'total_amount' => 1000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'cancelled', 'total_amount' => 4000]);

    Invoice::factory()->create([
        'party_id' => $party->id,
        'user_id' => $user->id,
        'total_amount' => 5000,
        'amount_paid' => 1000,
        'amount_due' => 4000,
    ]);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('stats.totalRevenue', 5000)
            ->where('stats.totalPaid', 1000)
            ->where('stats.totalDue', 4000)
        );
});
