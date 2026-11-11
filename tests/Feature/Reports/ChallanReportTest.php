<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\User;

function createReportChallan(array $challanData = [], array $productData = [], int $quantity = 10, int $unitPrice = 100): Challan
{
    $product = Product::factory()->create($productData);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'unit_price' => $unitPrice,
    ]);

    $challan = Challan::factory()->create(array_merge([
        'product_id' => $product->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'delivered',
    ], $challanData));

    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
    ]);

    $challan->update(['total_amount' => $quantity * $unitPrice]);

    return $challan;
}

test('challan report endpoint returns success with data', function () {
    createReportChallan();

    $response = $this->get('/api/reports/challan');

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
                        'challan_number',
                        'date',
                        'product_id',
                        'po_number',
                        'product_name',
                        'customer_po_number',
                        'party_name',
                        'address',
                        'notes',
                        'total_qty',
                        'total_amount',
                        'status',
                        'items' => [
                            '*' => [
                                'id',
                                'meal_type',
                                'description',
                                'quantity',
                                'unit_price',
                                'total',
                            ],
                        ],
                    ],
                ],
                'summary' => [
                    'total_challans',
                    'total_qty',
                    'total_amount',
                    'delivered_count',
                    'delivered_amount',
                    'dispatched_count',
                    'dispatched_amount',
                    'pending_count',
                    'pending_amount',
                    'cancelled_count',
                    'cancelled_amount',
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

test('challan report filters by party', function () {
    $partyA = Party::factory()->create(['party_name' => 'Party A']);
    $partyB = Party::factory()->create(['party_name' => 'Party B']);

    createReportChallan(productData: ['party_id' => $partyA->id]);
    createReportChallan(productData: ['party_id' => $partyB->id]);

    $response = $this->get("/api/reports/challan?party_id={$partyA->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_name'])->toBe('Party A');
});

test('challan report filters by status', function () {
    createReportChallan(challanData: ['status' => 'delivered']);
    createReportChallan(challanData: ['status' => 'pending']);

    $response = $this->get('/api/reports/challan?status=delivered');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['status'])->toBe('delivered');
});

test('challan report filters by date range', function () {
    createReportChallan(challanData: ['date' => '2026-01-15']);
    createReportChallan(challanData: ['date' => '2026-02-20']);

    $response = $this->get('/api/reports/challan?date_from=2026-01-01&date_to=2026-02-01');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['date'])->toBe('2026-01-15');
});

test('challan report searches by challan number product name or party', function () {
    $party = Party::factory()->create(['party_name' => 'Acme Supplies']);
    createReportChallan(
        challanData: ['challan_number' => 'Noor/2026/CH/9999'],
        productData: ['party_id' => $party->id, 'name' => 'Widgets']
    );

    $response = $this->get('/api/reports/challan?search=Acme');

    $response->assertOk();
    $data = $response->json('data');
    expect($data['rows'])->toHaveCount(1);
    expect($data['rows'][0]['party_name'])->toBe('Acme Supplies');

    $response = $this->get('/api/reports/challan?search=9999');

    $response->assertOk();
    expect($response->json('data.rows'))->toHaveCount(1);
    expect($response->json('data.rows.0.challan_number'))->toBe('Noor/2026/CH/9999');
});

test('challan report includes meal items', function () {
    createReportChallan(quantity: 23, unitPrice: 390);

    $response = $this->get('/api/reports/challan');

    $response->assertOk();
    $row = $response->json('data.rows.0');

    expect($row['items'])->toHaveCount(1);
    expect($row['items'][0]['quantity'])->toBe(23);
    expect($row['items'][0]['unit_price'])->toBe(390);
    expect($row['items'][0]['total'])->toBe(8970);
});

test('challan report summary calculates correctly', function () {
    createReportChallan(challanData: ['status' => 'delivered'], quantity: 10, unitPrice: 100);
    createReportChallan(challanData: ['status' => 'pending'], quantity: 5, unitPrice: 100);

    $response = $this->get('/api/reports/challan');

    $response->assertOk();
    $summary = $response->json('data.summary');

    expect($summary['total_challans'])->toBe(2);
    expect($summary['total_qty'])->toBe(15);
    expect($summary['total_amount'])->toBe(1500);
    expect($summary['delivered_count'])->toBe(1);
    expect($summary['delivered_amount'])->toBe(1000);
    expect($summary['pending_count'])->toBe(1);
    expect($summary['pending_amount'])->toBe(500);
    expect($summary['dispatched_count'])->toBe(0);
    expect($summary['cancelled_count'])->toBe(0);
});

test('challan report paginates and honors per_page', function () {
    for ($i = 0; $i < 30; $i++) {
        createReportChallan();
    }

    $default = $this->get('/api/reports/challan');
    $default->assertOk();
    expect($default->json('data.rows'))->toHaveCount(25);
    expect($default->json('data.pagination'))->toMatchArray([
        'current_page' => 1,
        'per_page' => 25,
        'total' => 30,
        'last_page' => 2,
    ]);

    $pageTwo = $this->get('/api/reports/challan?page=2');
    $pageTwo->assertOk();
    expect($pageTwo->json('data.rows'))->toHaveCount(5);
    expect($pageTwo->json('data.pagination.current_page'))->toBe(2);

    $perPageFifty = $this->get('/api/reports/challan?per_page=50');
    $perPageFifty->assertOk();
    expect($perPageFifty->json('data.rows'))->toHaveCount(30);

    $all = $this->get('/api/reports/challan?all=1&per_page=10');
    $all->assertOk();
    expect($all->json('data.rows'))->toHaveCount(30);
    expect($all->json('data.pagination.last_page'))->toBe(1);

    $invalidPerPage = $this->get('/api/reports/challan?per_page=7');
    $invalidPerPage->assertOk();
    expect($invalidPerPage->json('data.pagination.per_page'))->toBe(25);

    $summary = $default->json('data.summary');
    expect($summary['total_challans'])->toBe(30);
});

test('challan report only shows items that were actually delivered', function () {
    $challan = createReportChallan(quantity: 12, unitPrice: 100);
    $undeliveredMeal = ProductMeal::factory()->create([
        'product_id' => $challan->product_id,
        'unit_price' => 80,
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $undeliveredMeal->id,
        'quantity' => 0,
        'unit_price' => 80,
    ]);

    $response = $this->get('/api/reports/challan');

    $response->assertOk();
    $items = $response->json('data.rows.0.items');

    expect($items)->toHaveCount(1);
    expect($items[0]['quantity'])->toBe(12);
});

test('challan report excludes challans with nothing delivered', function () {
    createReportChallan(['challan_number' => 'CH-DELIVERED'], quantity: 5);
    createReportChallan(['challan_number' => 'CH-EMPTY'], quantity: 0);

    $response = $this->get('/api/reports/challan');

    $response->assertOk();
    expect(collect($response->json('data.rows'))->pluck('challan_number')->all())->toBe(['CH-DELIVERED']);
    expect($response->json('data.summary.total_challans'))->toBe(1);
});
