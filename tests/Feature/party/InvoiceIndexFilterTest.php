<?php

use App\Models\Invoice;
use App\Models\Party;

function indexInvoice(Party $party, string $status = 'pending', string $date = '2026-03-10'): Invoice
{
    return Invoice::factory()->create([
        'party_id' => $party->id,
        'status' => $status,
        'date' => $date,
        'due_date' => '2026-04-10',
    ]);
}

function indexInvoiceIds($response): array
{
    return collect($response->json('data.items'))
        ->pluck('id')
        ->sort()
        ->values()
        ->all();
}

test('invoice index filters by party', function () {
    $alpha = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $beta = Party::factory()->create(['party_name' => 'Beta Supplies']);

    $alphaInvoice = indexInvoice($alpha);
    $betaInvoice = indexInvoice($beta);

    $response = $this->get("/api/invoices?party_id={$alpha->id}")->assertOk();

    expect(indexInvoiceIds($response))->toBe([$alphaInvoice->id]);
    expect($response->json('data.total'))->toBe(1);
});

test('invoice index party filter excludes soft deleted invoices', function () {
    $party = Party::factory()->create();
    $kept = indexInvoice($party);
    $deleted = indexInvoice($party);
    $deleted->delete();

    $response = $this->get("/api/invoices?party_id={$party->id}")->assertOk();

    expect(indexInvoiceIds($response))->toBe([$kept->id]);
});

test('invoice index filters by status', function () {
    $party = Party::factory()->create();
    $paid = indexInvoice($party, 'paid');
    indexInvoice($party, 'pending');

    $response = $this->get('/api/invoices?status=paid')->assertOk();

    expect(indexInvoiceIds($response))->toBe([$paid->id]);
});

test('invoice index treats status all as no filter', function () {
    $party = Party::factory()->create();
    indexInvoice($party, 'paid');
    indexInvoice($party, 'pending');

    $response = $this->get('/api/invoices?status=all')->assertOk();

    expect($response->json('data.total'))->toBe(2);
});

test('invoice index filters by date range inclusively on both bounds', function () {
    $party = Party::factory()->create();
    $early = indexInvoice($party, 'pending', '2026-01-05');
    $middle = indexInvoice($party, 'pending', '2026-02-10');
    $late = indexInvoice($party, 'pending', '2026-05-20');

    $both = $this->get('/api/invoices?date_from=2026-01-05&date_to=2026-02-10')->assertOk();
    expect(indexInvoiceIds($both))->toBe([$early->id, $middle->id]);

    $fromOnly = $this->get('/api/invoices?date_from=2026-02-10')->assertOk();
    expect(indexInvoiceIds($fromOnly))->toBe([$middle->id, $late->id]);

    $toOnly = $this->get('/api/invoices?date_to=2026-01-05')->assertOk();
    expect(indexInvoiceIds($toOnly))->toBe([$early->id]);
});

test('invoice index combines party status and date filters', function () {
    $alpha = Party::factory()->create();
    $beta = Party::factory()->create();

    $wanted = indexInvoice($alpha, 'paid', '2026-02-10');
    indexInvoice($alpha, 'pending', '2026-02-10');
    indexInvoice($alpha, 'paid', '2026-08-01');
    indexInvoice($beta, 'paid', '2026-02-10');

    $response = $this->get("/api/invoices?party_id={$alpha->id}&status=paid&date_from=2026-01-01&date_to=2026-03-31")
        ->assertOk();

    expect(indexInvoiceIds($response))->toBe([$wanted->id]);
});

test('invoice index still searches and paginates alongside the filters', function () {
    $alpha = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $beta = Party::factory()->create(['party_name' => 'Beta Supplies']);

    $alphaInvoice = indexInvoice($alpha);
    $betaInvoice = indexInvoice($beta);

    $matching = $this->get("/api/invoices?party_id={$alpha->id}&search=Alpha&limit=10")->assertOk();
    expect(indexInvoiceIds($matching))->toBe([$alphaInvoice->id]);

    $contradictory = $this->get("/api/invoices?party_id={$alpha->id}&search=Beta&limit=10")->assertOk();
    expect(indexInvoiceIds($contradictory))->toBe([]);

    $paged = $this->get("/api/invoices?party_id={$alpha->id}&page=1&limit=1")->assertOk();
    expect($paged->json('data.total'))->toBe(1);
    expect($betaInvoice->id)->not->toBe($alphaInvoice->id);
});
