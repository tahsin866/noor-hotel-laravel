<?php

use App\Models\Party;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->partyAdmin = User::factory()->create();
    $this->partyAdmin->roles()->attach(Role::where('name', 'admin')->first());
});

test('a party can be created with bill submission requirements', function () {
    $response = $this->actingAs($this->partyAdmin)->postJson('/api/party', [
        'party_name' => 'X Company',
        'party_type' => 'customer',
        'requirements' => ['5% VAT copy', '  Trade License  ', '', null],
    ]);

    $response->assertCreated()
        ->assertJsonPath('party.requirements', ['5% VAT copy', 'Trade License']);

    expect(Party::where('party_name', 'X Company')->first()->requirements)
        ->toBe(['5% VAT copy', 'Trade License']);
});

test('party requirements can be updated and cleared', function () {
    $party = Party::factory()->create(['requirements' => ['VAT copy']]);

    $this->actingAs($this->partyAdmin)->putJson("/api/party/{$party->id}", [
        'party_name' => $party->party_name,
        'requirements' => ['VAT copy', 'TIN certificate'],
    ])->assertOk()->assertJsonPath('party.requirements', ['VAT copy', 'TIN certificate']);

    $this->actingAs($this->partyAdmin)->putJson("/api/party/{$party->id}", [
        'party_name' => $party->party_name,
        'requirements' => [],
    ])->assertOk()->assertJsonPath('party.requirements', []);

    expect($party->fresh()->requirements)->toBe([]);
});

test('party requirements must be strings within length', function () {
    $this->actingAs($this->partyAdmin)->postJson('/api/party', [
        'party_name' => 'X Company',
        'requirements' => [str_repeat('a', 256)],
    ])->assertUnprocessable()->assertJsonValidationErrors('requirements.0');
});

test('party index respects the per page option', function (int $perPage) {
    Party::factory()->count(25)->create();

    $this->actingAs($this->partyAdmin)
        ->get("/party?per_page={$perPage}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/party')
            ->where('parties.per_page', $perPage)
            ->has('parties.data', min($perPage, 25))
            ->where('filters.per_page', $perPage));
})->with([10, 20, 50]);

test('party index falls back to 10 per page for invalid values', function () {
    Party::factory()->count(15)->create();

    $this->actingAs($this->partyAdmin)
        ->get('/party?per_page=7')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('parties.per_page', 10)
            ->has('parties.data', 10));
});

test('party index keeps per page in pagination links and filters by end date range', function () {
    Party::factory()->create(['end_date' => '2026-01-15', 'party_name' => 'Early']);
    Party::factory()->create(['end_date' => '2026-06-15', 'party_name' => 'Middle']);
    Party::factory()->create(['end_date' => '2026-12-15', 'party_name' => 'Late']);

    $this->actingAs($this->partyAdmin)
        ->get('/party?per_page=20&end_date_from=2026-03-01&end_date_to=2026-09-30')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('parties.data', 1)
            ->where('parties.data.0.party_name', 'Middle')
            ->where('parties.first_page_url', fn (string $url) => str_contains($url, 'per_page=20')));
});

test('invoice page shares each party bill submission requirements', function () {
    $party = Party::factory()->create(['requirements' => ['5% VAT copy', 'Trade License']]);

    $this->actingAs($this->partyAdmin)
        ->get('/invoices')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/invoice')
            ->where('parties.0.id', $party->id)
            ->where('parties.0.requirements', ['5% VAT copy', 'Trade License']));
});
