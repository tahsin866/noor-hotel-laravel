<?php

use App\Models\Challan;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use App\Models\Product;
use App\Models\User;

function createReportPayment(array $paymentData = [], array $invoiceData = [], array $partyData = [], ?Party $party = null): PaymentHistory
{
    $invoice = Invoice::factory()->create(array_merge([
        'party_id' => ($party ?? Party::factory()->create($partyData))->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'partial',
    ], $invoiceData));

    return PaymentHistory::factory()->create(array_merge([
        'invoice_id' => $invoice->id,
    ], $paymentData));
}

test('payment report endpoint returns success with data', function () {
    createReportPayment();

    $response = $this->get('/api/reports/payment');

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
                        'invoice_id',
                        'invoice_number',
                        'party_id',
                        'party_name',
                        'payment_date',
                        'amount',
                        'payment_method',
                        'reference_number',
                        'notes',
                        'payment_status',
                        'customer_bank_name',
                        'user_bank_name',
                        'reduce_amount',
                        'reduce_note',
                        'attachment',
                        'invoice_status',
                        'is_unpaid',
                    ],
                ],
                'summary' => [
                    'total_payments',
                    'total_amount',
                    'total_reduce',
                    'chalan_total',
                    'chalan_pending',
                    'chalan_dispatched',
                    'chalan_delivered',
                    'chalan_cancelled',
                    'paid_total',
                    'due_total',
                    'unpaid_count',
                    'unpaid_amount',
                    'total_receivable',
                    'cash_count',
                    'cash_amount',
                    'bank_transfer_count',
                    'bank_transfer_amount',
                    'cheque_count',
                    'cheque_amount',
                    'mobile_count',
                    'mobile_amount',
                    'paid_count',
                    'paid_amount',
                    'partial_count',
                    'partial_amount',
                    'due_count',
                    'due_amount',
                ],
                'pagination' => [
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                ],
            ],
        ]);
});

test('payment report filters by party', function () {
    $partyA = Party::factory()->create(['party_name' => 'Party A']);
    $partyB = Party::factory()->create(['party_name' => 'Party B']);

    createReportPayment(party: $partyA);
    createReportPayment(party: $partyB);

    $response = $this->get("/api/reports/payment?party_id={$partyA->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_name'])->toBe('Party A');
});

test('payment report filters by method', function () {
    createReportPayment(paymentData: ['payment_method' => 'cash']);
    createReportPayment(paymentData: ['payment_method' => 'bank_transfer']);

    $response = $this->get('/api/reports/payment?method=cash');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['payment_method'])->toBe('cash');
});

test('payment report filters by payment status', function () {
    createReportPayment(paymentData: ['payment_status' => 'paid']);
    createReportPayment(paymentData: ['payment_status' => 'due']);

    $response = $this->get('/api/reports/payment?status=paid');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['payment_status'])->toBe('paid');
});

test('payment report filters by date range', function () {
    createReportPayment(paymentData: ['payment_date' => '2026-01-15']);
    createReportPayment(paymentData: ['payment_date' => '2026-02-20']);

    $response = $this->get('/api/reports/payment?date_from=2026-01-01&date_to=2026-02-01');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['payment_date'])->toBe('2026-01-15');
});

test('payment report searches by invoice number party or reference', function () {
    $party = Party::factory()->create(['party_name' => 'Acme Supplies']);
    createReportPayment(
        paymentData: ['reference_number' => 'TRX-8888'],
        invoiceData: ['invoice_number' => 'Noor/2026/IN/0555'],
        partyData: ['party_name' => 'Acme Supplies']
    );

    $response = $this->get('/api/reports/payment?search=Acme');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.party_name'))->toBe('Acme Supplies');

    $response = $this->get('/api/reports/payment?search=TRX-8888');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.reference_number'))->toBe('TRX-8888');

    $response = $this->get('/api/reports/payment?search=0555');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.invoice_number'))->toBe('Noor/2026/IN/0555');
});

test('payment report summary calculates correctly', function () {
    createReportPayment(paymentData: [
        'payment_method' => 'cash',
        'payment_status' => 'paid',
        'amount' => 1000,
        'reduce_amount' => 100,
    ]);
    createReportPayment(paymentData: [
        'payment_method' => 'bank_transfer',
        'payment_status' => 'partial',
        'amount' => 500,
        'reduce_amount' => 0,
    ]);
    createReportPayment(paymentData: [
        'payment_method' => 'cheque',
        'payment_status' => 'due',
        'amount' => 250,
        'reduce_amount' => 0,
    ]);

    $response = $this->get('/api/reports/payment');

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['total_payments'])->toBe(3);
    expect($summary['total_amount'])->toBe(1750);
    expect($summary['total_reduce'])->toBe(100);
    expect($summary['cash_count'])->toBe(1);
    expect($summary['cash_amount'])->toBe(1000);
    expect($summary['bank_transfer_count'])->toBe(1);
    expect($summary['bank_transfer_amount'])->toBe(500);
    expect($summary['cheque_count'])->toBe(1);
    expect($summary['cheque_amount'])->toBe(250);
    expect($summary['mobile_count'])->toBe(0);
    expect($summary['mobile_amount'])->toBe(0);
    expect($summary['paid_count'])->toBe(1);
    expect($summary['paid_amount'])->toBe(1000);
    expect($summary['partial_count'])->toBe(1);
    expect($summary['partial_amount'])->toBe(500);
    expect($summary['due_count'])->toBe(1);
    expect($summary['due_amount'])->toBe(250);
});

test('payment report includes invoice and party details', function () {
    $party = Party::factory()->create(['party_name' => 'Orion Traders']);
    createReportPayment(
        paymentData: [
            'payment_method' => 'mobile',
            'payment_status' => 'paid',
            'amount' => 780,
            'reference_number' => 'MBL-2201',
        ],
        invoiceData: ['invoice_number' => 'Noor/2026/IN/0601'],
        partyData: ['party_name' => 'Orion Traders']
    );

    $response = $this->get('/api/reports/payment');

    $response->assertOk();
    $row = $response->json('data.rows.0');

    expect($row['invoice_number'])->toBe('Noor/2026/IN/0601');
    expect($row['party_name'])->toBe('Orion Traders');
    expect($row['payment_method'])->toBe('mobile');
    expect($row['reference_number'])->toBe('MBL-2201');
    expect($row['amount'])->toEqual(780);
});

test('payment report includes unpaid invoices with no payments', function () {
    $unpaid = Invoice::factory()->create([
        'party_id' => Party::factory()->create(['party_name' => 'Globe Traders'])->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 5000,
        'amount_paid' => 0,
        'amount_due' => 5000,
        'date' => '2026-03-10',
    ]);
    createReportPayment(paymentData: ['payment_date' => '2026-03-11']);

    $response = $this->get('/api/reports/payment');

    $response->assertOk();
    $rows = $response->json('data.rows');

    expect($rows)->toHaveCount(2);
    $unpaidRow = collect($rows)->firstWhere('is_unpaid', true);
    expect($unpaidRow['invoice_number'])->toBe($unpaid->invoice_number);
    expect($unpaidRow['amount'])->toEqual(5000);
    expect($unpaidRow['payment_status'])->toBe('unpaid');
    expect($unpaidRow['party_name'])->toBe('Globe Traders');
    expect($unpaidRow['payment_method'])->toBeNull();
});

test('payment report filters unpaid invoices by status', function () {
    Invoice::factory()->create([
        'party_id' => Party::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 4000,
        'amount_paid' => 0,
        'amount_due' => 4000,
    ]);
    createReportPayment(paymentData: ['payment_status' => 'paid']);

    $response = $this->get('/api/reports/payment?status=unpaid');

    $response->assertOk();
    $rows = $response->json('data.rows');

    expect($rows)->toHaveCount(1);
    expect($rows[0]['is_unpaid'])->toBeTrue();
    expect($rows[0]['payment_status'])->toBe('unpaid');
});

test('payment report summary includes unpaid invoices', function () {
    createReportPayment(paymentData: [
        'payment_method' => 'cash',
        'payment_status' => 'paid',
        'amount' => 1000,
        'reduce_amount' => 0,
    ]);
    Invoice::factory()->create([
        'party_id' => Party::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 5000,
        'amount_paid' => 0,
        'amount_due' => 5000,
    ]);

    $response = $this->get('/api/reports/payment');

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['total_payments'])->toBe(1);
    expect($summary['total_amount'])->toBe(1000);
    expect($summary['unpaid_count'])->toBe(1);
    expect($summary['unpaid_amount'])->toBe(5000);
    expect($summary['total_receivable'])->toBe(6000);
});

test('payment report excludes unpaid invoices when method filter is applied', function () {
    Invoice::factory()->create([
        'party_id' => Party::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 4000,
        'amount_paid' => 0,
        'amount_due' => 4000,
    ]);
    createReportPayment(paymentData: ['payment_method' => 'cash']);

    $response = $this->get('/api/reports/payment?method=cash');

    $response->assertOk();
    $rows = $response->json('data.rows');

    expect($rows)->toHaveCount(1);
    expect($rows[0]['is_unpaid'])->toBeFalse();
});

test('payment report date filter applies to unpaid invoices by invoice date', function () {
    Invoice::factory()->create([
        'party_id' => Party::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 3000,
        'amount_paid' => 0,
        'amount_due' => 3000,
        'date' => '2026-03-10',
    ]);
    Invoice::factory()->create([
        'party_id' => Party::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'total_amount' => 7000,
        'amount_paid' => 0,
        'amount_due' => 7000,
        'date' => '2026-04-20',
    ]);

    $response = $this->get('/api/reports/payment?date_from=2026-03-01&date_to=2026-03-31');

    $response->assertOk();
    $rows = $response->json('data.rows');

    expect($rows)->toHaveCount(1);
    expect($rows[0]['is_unpaid'])->toBeTrue();
    expect($rows[0]['payment_date'])->toBe('2026-03-10');
});

test('payment report summary calculates chalan paid and due totals', function () {
    $party = Party::factory()->create(['party_name' => 'Delta Traders']);
    $otherParty = Party::factory()->create(['party_name' => 'Other Co']);
    $product = Product::factory()->create(['party_id' => $party->id]);
    $otherProduct = Product::factory()->create(['party_id' => $otherParty->id]);

    Challan::factory()->create([
        'product_id' => $product->id,
        'total_amount' => 4000,
        'status' => 'delivered',
    ]);
    Challan::factory()->create([
        'product_id' => $product->id,
        'total_amount' => 6000,
        'status' => 'delivered',
    ]);
    Challan::factory()->create([
        'product_id' => $otherProduct->id,
        'total_amount' => 9999,
        'status' => 'delivered',
    ]);
    createReportPayment(
        paymentData: ['amount' => 2500],
        party: $party
    );

    $response = $this->get('/api/reports/payment');

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['chalan_total'])->toBe(19999);
    expect($summary['chalan_delivered'])->toBe(19999);
    expect($summary['chalan_pending'])->toBe(0);
    expect($summary['chalan_dispatched'])->toBe(0);
    expect($summary['chalan_cancelled'])->toBe(0);
    expect($summary['paid_total'])->toBe(2500);
    expect($summary['due_total'])->toBe(17499);

    $filtered = $this->get("/api/reports/payment?party_id={$party->id}");
    $filtered->assertOk();
    $filteredSummary = $filtered->json('data.summary');

    expect($filteredSummary['chalan_total'])->toBe(10000);
    expect($filteredSummary['chalan_delivered'])->toBe(10000);
    expect($filteredSummary['paid_total'])->toBe(2500);
    expect($filteredSummary['due_total'])->toBe(7500);
});

test('payment report splits challan totals by status and excludes cancelled from due', function () {
    $party = Party::factory()->create();
    $product = Product::factory()->create(['party_id' => $party->id]);

    Challan::factory()->create(['product_id' => $product->id, 'status' => 'pending', 'total_amount' => 1000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'dispatched', 'total_amount' => 2000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered', 'total_amount' => 3000]);
    Challan::factory()->create(['product_id' => $product->id, 'status' => 'cancelled', 'total_amount' => 4000]);

    $response = $this->get("/api/reports/payment?party_id={$party->id}");

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['chalan_pending'])->toBe(1000);
    expect($summary['chalan_dispatched'])->toBe(2000);
    expect($summary['chalan_delivered'])->toBe(3000);
    expect($summary['chalan_cancelled'])->toBe(4000);
    expect($summary['chalan_total'])->toBe(10000);
    expect($summary['due_total'])->toBe(5000);
});

test('payment report paginates and honors per_page', function () {
    for ($i = 0; $i < 12; $i++) {
        createReportPayment();
    }

    $default = $this->get('/api/reports/payment');
    $default->assertOk();
    expect($default->json('data.rows'))->toHaveCount(10);
    expect($default->json('data.pagination'))->toMatchArray([
        'current_page' => 1,
        'per_page' => 10,
        'total' => 12,
        'last_page' => 2,
    ]);

    $pageTwo = $this->get('/api/reports/payment?page=2');
    $pageTwo->assertOk();
    expect($pageTwo->json('data.rows'))->toHaveCount(2);
    expect($pageTwo->json('data.pagination.current_page'))->toBe(2);

    $perPageTwenty = $this->get('/api/reports/payment?per_page=20');
    $perPageTwenty->assertOk();
    expect($perPageTwenty->json('data.rows'))->toHaveCount(12);

    $invalidPerPage = $this->get('/api/reports/payment?per_page=7');
    $invalidPerPage->assertOk();
    expect($invalidPerPage->json('data.pagination.per_page'))->toBe(10);

    $summary = $default->json('data.summary');
    expect($summary['total_payments'])->toBe(12);
});
