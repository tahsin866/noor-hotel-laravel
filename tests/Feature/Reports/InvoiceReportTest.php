<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\User;

function createReportInvoice(
    array $invoiceData = [],
    array $productData = [],
    int $quantity = 10,
    float $unitPrice = 100,
    float $vatRate = 10
): Invoice {
    $product = Product::factory()->create($productData);

    $lineSubtotal = $quantity * $unitPrice;
    $vatAmount = round($lineSubtotal * $vatRate / 100, 2);
    $lineTotal = round($lineSubtotal + $vatAmount, 2);

    $status = $invoiceData['status'] ?? 'paid';
    $amountPaid = match ($status) {
        'paid' => $lineTotal,
        'partial' => round($lineTotal / 2, 2),
        default => 0,
    };
    $amountDue = round($lineTotal - $amountPaid, 2);

    $invoice = Invoice::factory()->create(array_merge([
        'party_id' => $product->party_id,
        'user_id' => User::factory()->create()->id,
        'subtotal' => $lineSubtotal,
        'total_vat' => $vatAmount,
        'total_amount' => $lineTotal,
        'amount_paid' => $amountPaid,
        'amount_due' => $amountDue,
        'status' => $status,
    ], $invoiceData));

    InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'vat_rate' => $vatRate,
        'vat_amount' => $vatAmount,
        'total' => $lineTotal,
    ]);

    return $invoice;
}

test('invoice report endpoint returns success with data', function () {
    createReportInvoice();

    $response = $this->get('/api/reports/invoice');

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
                        'invoice_number',
                        'date',
                        'due_date',
                        'party_id',
                        'party_name',
                        'address',
                        'customer_po_number',
                        'notes',
                        'subtotal',
                        'total_vat',
                        'total_amount',
                        'amount_paid',
                        'amount_due',
                        'status',
                        'items' => [
                            '*' => [
                                'id',
                                'product_name',
                                'meal_type',
                                'quantity',
                                'unit_price',
                                'vat_rate',
                                'vat_amount',
                                'total',
                            ],
                        ],
                        'challans' => [
                            '*' => [
                                'id',
                                'challan_number',
                                'po_number',
                                'product_name',
                                'date',
                                'status',
                            ],
                        ],
                    ],
                ],
                'summary' => [
                    'total_invoices',
                    'total_amount',
                    'total_paid',
                    'total_due',
                    'paid_count',
                    'paid_amount',
                    'partial_count',
                    'partial_amount',
                    'pending_count',
                    'pending_amount',
                    'overdue_count',
                    'overdue_amount',
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

test('invoice report filters by party', function () {
    $partyA = Party::factory()->create(['party_name' => 'Party A']);
    $partyB = Party::factory()->create(['party_name' => 'Party B']);

    createReportInvoice(productData: ['party_id' => $partyA->id]);
    createReportInvoice(productData: ['party_id' => $partyB->id]);

    $response = $this->get("/api/reports/invoice?party_id={$partyA->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_name'])->toBe('Party A');
});

test('invoice report filters by status', function () {
    createReportInvoice(invoiceData: ['status' => 'paid']);
    createReportInvoice(invoiceData: ['status' => 'pending']);

    $response = $this->get('/api/reports/invoice?status=paid');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['status'])->toBe('paid');
});

test('invoice report filters by date range', function () {
    createReportInvoice(invoiceData: ['date' => '2026-01-15']);
    createReportInvoice(invoiceData: ['date' => '2026-02-20']);

    $response = $this->get('/api/reports/invoice?date_from=2026-01-01&date_to=2026-02-01');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['date'])->toBe('2026-01-15');
});

test('invoice report searches by invoice number product or party', function () {
    $party = Party::factory()->create(['party_name' => 'Acme Supplies']);
    createReportInvoice(
        invoiceData: ['invoice_number' => 'Noor/2026/IN/9999'],
        productData: ['party_id' => $party->id, 'name' => 'Widgets', 'customer_po_number' => 'PO-77777']
    );

    $response = $this->get('/api/reports/invoice?search=Acme');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.party_name'))->toBe('Acme Supplies');

    $response = $this->get('/api/reports/invoice?search=Widgets');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);

    $response = $this->get('/api/reports/invoice?search=PO-77777');
    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.customer_po_number'))->toBe('PO-77777');
});

test('invoice report includes items with vat', function () {
    createReportInvoice(quantity: 23, unitPrice: 390, vatRate: 15);

    $response = $this->get('/api/reports/invoice');

    $response->assertOk();
    $row = $response->json('data.rows.0');

    expect($row['items'])->toHaveCount(1);
    expect($row['items'][0]['quantity'])->toBe(23);
    expect($row['items'][0]['unit_price'])->toBe(390);
    expect($row['items'][0]['vat_rate'])->toBe(15);
    expect($row['items'][0]['vat_amount'])->toBe(1345.5);
    expect($row['items'][0]['total'])->toBe(10315.5);
});

test('invoice report excludes items with zero quantity', function () {
    $invoice = createReportInvoice();

    InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'product_id' => Product::factory()->create()->id,
        'meal_type' => 'dinner',
        'quantity' => 0,
        'unit_price' => 145,
        'vat_rate' => 0,
        'vat_amount' => 0,
        'total' => 0,
    ]);

    $response = $this->get('/api/reports/invoice');

    $response->assertOk();
    $row = $response->json('data.rows.0');
    expect($row['items'])->toHaveCount(1);
    expect($row['items'][0]['quantity'])->toBe(10);
    expect(collect($row['items'])->pluck('quantity'))->not->toContain(0);
});

test('invoice report includes linked challans', function () {
    $invoice = createReportInvoice();

    $product = Product::factory()->create();
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'user_id' => User::factory()->create()->id,
        'challan_number' => 'Noor/2026/CH/5555',
        'status' => 'delivered',
    ]);
    $invoice->challans()->attach($challan->id);

    $response = $this->get('/api/reports/invoice');

    $response->assertOk();
    $row = $response->json('data.rows.0');
    expect($row['challans'])->toHaveCount(1);
    expect($row['challans'][0]['challan_number'])->toBe('Noor/2026/CH/5555');
    expect($row['challans'][0]['status'])->toBe('delivered');
});

test('invoice report summary calculates correctly', function () {
    createReportInvoice(invoiceData: ['status' => 'paid'], quantity: 10, unitPrice: 100, vatRate: 10);
    createReportInvoice(invoiceData: ['status' => 'pending'], quantity: 5, unitPrice: 100, vatRate: 10);

    $response = $this->get('/api/reports/invoice');

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['total_invoices'])->toBe(2);
    expect($summary['total_amount'])->toBe(1650);
    expect($summary['total_paid'])->toBe(1100);
    expect($summary['total_due'])->toBe(550);
    expect($summary['paid_count'])->toBe(1);
    expect($summary['paid_amount'])->toBe(1100);
    expect($summary['pending_count'])->toBe(1);
    expect($summary['pending_amount'])->toBe(550);
    expect($summary['partial_count'])->toBe(0);
    expect($summary['overdue_count'])->toBe(0);
});

test('invoice report paginates and honors per_page', function () {
    for ($i = 0; $i < 12; $i++) {
        createReportInvoice();
    }

    $default = $this->get('/api/reports/invoice');
    $default->assertOk();
    expect($default->json('data.rows'))->toHaveCount(10);
    expect($default->json('data.pagination'))->toMatchArray([
        'current_page' => 1,
        'per_page' => 10,
        'total' => 12,
        'last_page' => 2,
    ]);

    $pageTwo = $this->get('/api/reports/invoice?page=2');
    $pageTwo->assertOk();
    expect($pageTwo->json('data.rows'))->toHaveCount(2);
    expect($pageTwo->json('data.pagination.current_page'))->toBe(2);

    $perPageTwenty = $this->get('/api/reports/invoice?per_page=20');
    $perPageTwenty->assertOk();
    expect($perPageTwenty->json('data.rows'))->toHaveCount(12);

    $invalidPerPage = $this->get('/api/reports/invoice?per_page=7');
    $invalidPerPage->assertOk();
    expect($invalidPerPage->json('data.pagination.per_page'))->toBe(10);

    $summary = $default->json('data.summary');
    expect($summary['total_invoices'])->toBe(12);
});
