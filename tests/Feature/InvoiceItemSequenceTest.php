<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

/**
 * @return array{0: Party, 1: Product, 2: array<int, ProductMeal>}
 */
function createSequencedPurchaseOrder(): array
{
    $party = Party::factory()->create();

    $productId = test()->post('/api/products', [
        'name' => 'Sequenced PO',
        'unit' => 'pcs',
        'vat_rate' => 0,
        'party_id' => $party->id,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 100, 'unit_price' => 440, 'description' => 'Menu 04'],
            ['meal_type' => 'snacks', 'quantity' => 60, 'unit_price' => 100, 'description' => 'Chicken Patties'],
            ['meal_type' => 'dinner', 'quantity' => 40, 'unit_price' => 300, 'description' => 'Beef Tehari'],
        ],
    ])->assertCreated()->json('product.id');

    $product = Product::query()->findOrFail($productId);

    return [$party, $product, $product->meals->all()];
}

function deliverSequencedMeals(Product $product, array $quantitiesByMeal): Challan
{
    $challan = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);

    foreach ($quantitiesByMeal as [$meal, $quantity]) {
        ChallanItem::factory()->create([
            'challan_id' => $challan->id,
            'product_meal_id' => $meal->id,
            'quantity' => $quantity,
            'unit_price' => $meal->unit_price,
        ]);
    }

    return $challan;
}

test('purchase order lines keep the order they were entered in', function () {
    [, $product] = createSequencedPurchaseOrder();

    expect($product->meals->pluck('description')->all())
        ->toBe(['Menu 04', 'Chicken Patties', 'Beef Tehari']);
    expect($product->meals->pluck('sort_order')->all())->toBe([1, 2, 3]);
});

test('reordering purchase order lines on update changes their sequence', function () {
    [, $product, [$lunch, $snacks, $dinner]] = createSequencedPurchaseOrder();

    $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            ['id' => $dinner->id, 'meal_type' => 'dinner', 'quantity' => 40, 'unit_price' => 300, 'description' => 'Beef Tehari'],
            ['id' => $lunch->id, 'meal_type' => 'lunch', 'quantity' => 100, 'unit_price' => 440, 'description' => 'Menu 04'],
            ['id' => $snacks->id, 'meal_type' => 'snacks', 'quantity' => 60, 'unit_price' => 100, 'description' => 'Chicken Patties'],
        ],
    ])->assertOk();

    expect($product->fresh()->meals->pluck('description')->all())
        ->toBe(['Beef Tehari', 'Menu 04', 'Chicken Patties']);
});

test('invoice items follow the purchase order sequence regardless of challan order', function () {
    [$party, $product, [$lunch, $snacks, $dinner]] = createSequencedPurchaseOrder();

    $firstChallan = deliverSequencedMeals($product, [[$dinner, 40], [$lunch, 50]]);
    $secondChallan = deliverSequencedMeals($product, [[$snacks, 60], [$lunch, 50]]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [$secondChallan->id, $firstChallan->id],
    ])->assertOk();

    $items = Invoice::query()->firstOrFail()->items;

    expect($items->pluck('description')->all())->toBe(['Menu 04', 'Chicken Patties', 'Beef Tehari']);
    expect($items->pluck('quantity')->map(fn ($quantity) => (int) $quantity)->all())->toBe([100, 60, 40]);
    expect($items->pluck('sort_order')->all())->toBe([1, 2, 3]);
});

test('rebuild command puts existing invoice lines back into purchase order sequence', function () {
    [$party, $product, [$lunch, $snacks]] = createSequencedPurchaseOrder();
    $challan = deliverSequencedMeals($product, [[$lunch, 10], [$snacks, 5]]);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [$challan->id],
    ])->assertOk();

    $invoice = Invoice::query()->firstOrFail();
    $invoice->items->firstWhere('description', 'Menu 04')->update(['sort_order' => 9]);

    expect($invoice->fresh()->items->pluck('description')->first())->toBe('Chicken Patties');

    $this->artisan('invoices:rebuild-items --apply')
        ->expectsOutputToContain('item order: reordered to match the purchase order sequence')
        ->assertSuccessful();

    expect($invoice->fresh()->items->pluck('description')->all())->toBe(['Menu 04', 'Chicken Patties']);
});
