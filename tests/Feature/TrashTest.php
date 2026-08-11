<?php

use App\Models\Challan;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from the trash page', function () {
    $this->get('/trash')->assertRedirect(route('login'));
});

test('guests cannot mutate trash', function () {
    $this->post('/trash/parties/1/restore')->assertRedirect(route('login'));
    $this->delete('/trash/parties/1')->assertRedirect(route('login'));
});

test('trash page lists only soft deleted records', function () {
    $user = User::factory()->create();
    $party = Party::factory()->create(['party_name' => 'Trashed Co']);
    $active = Party::factory()->create(['party_name' => 'Active Co']);

    $party->delete();

    $this->actingAs($user)->get('/trash')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/trash')
            ->has('items.parties', 1)
            ->where('items.parties.0.id', $party->id)
            ->where('items.parties.0.name', 'Trashed Co')
        );
});

test('trash page includes products challans invoices and payments', function () {
    $user = User::factory()->create();
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);
    $invoice = Invoice::factory()->create([
        'party_id' => $party->id,
        'user_id' => $user->id,
    ]);
    $payment = PaymentHistory::factory()->create(['invoice_id' => $invoice->id]);
    $challan = Challan::factory()->create(['product_id' => $product->id]);

    $product->delete();
    $invoice->delete();
    $payment->delete();
    $challan->delete();

    $this->actingAs($user)->get('/trash')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/trash')
            ->has('items.products', 1)
            ->has('items.invoices', 1)
            ->has('items.payments', 1)
            ->has('items.challans', 1)
        );
});

test('users can restore a soft deleted record', function () {
    $user = User::factory()->create();
    $party = Party::factory()->create();
    $party->delete();

    expect(Party::find($party->id))->toBeNull();

    $this->actingAs($user)
        ->post("/trash/parties/{$party->id}/restore")
        ->assertRedirect();

    expect(Party::find($party->id))->not->toBeNull();
});

test('users can permanently delete a soft deleted record', function () {
    $user = User::factory()->create();
    $party = Party::factory()->create();
    $party->delete();

    $this->actingAs($user)
        ->delete("/trash/parties/{$party->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('parties', ['id' => $party->id]);
});

test('restore and destroy reject unknown trash models', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/trash/unknown/1/restore')->assertNotFound();
    $this->actingAs($user)->delete('/trash/unknown/1')->assertNotFound();
});
