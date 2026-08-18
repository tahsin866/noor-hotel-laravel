<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductMeal;

function createInvoicedChallan(Party $party, int $quantity = 10, float $unitPrice = 100, float $vatRate = 10): Challan
{
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => $vatRate,
    ]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => $unitPrice,
    ]);
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
    ]);

    return $challan;
}

function createChallanInvoice($test, array $challanIds, Party $party): Invoice
{
    $test->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => $challanIds,
    ])->assertOk();

    return Invoice::query()->first();
}

test('challan show returns full details including total qty', function () {
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicedChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan->update([
        'address' => '123 Main Street',
        'notes' => 'Handle with care',
    ]);

    $response = $this->get("/api/challans/{$challan->id}");

    $response->assertOk();
    $data = $response->json('data');

    expect($data['challan_number'])->toBe($challan->challan_number);
    expect($data['product_name'])->toBe($challan->product->name);
    expect($data['po_number'])->toBe($challan->product->code);
    expect($data['customer_po_number'])->toBe($challan->product->customer_po_number ?? '-');
    expect($data['party_name'])->toBe($party->party_name);
    expect($data['address'])->toBe('123 Main Street');
    expect($data['notes'])->toBe('Handle with care');
    expect($data['total_qty'])->toBe(10);
    expect($data['total_amount'])->toBe($challan->total_amount);
    expect($data['items'])->toHaveCount(1);
    expect($data['items'][0]['quantity'])->toBe(10);
    expect($data['items'][0]['product_name'])->toBe($challan->product->name);
    expect($data['items'][0]['meal_type'])->toBe('lunch');
});

test('editing a challan rebuilds the linked invoice totals', function () {
    $party = Party::factory()->create(['party_name' => 'Alpha Traders']);
    $challan = createInvoicedChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $invoice = createChallanInvoice($this, [$challan->id], $party);

    expect($invoice->total_amount)->toEqual(1100.0);
    expect($invoice->subtotal)->toEqual(1000.0);
    expect($invoice->total_vat)->toEqual(100.0);

    $meal = $challan->items()->first()->productMeal;

    $response = $this->put("/api/challans/{$challan->id}", [
        'product_id' => $challan->product_id,
        'date' => $challan->date,
        'address' => '123 Main Street',
        'notes' => 'updated qty',
        'items' => [[
            'product_meal_id' => $meal->id,
            'quantity' => 5,
        ]],
    ]);

    $response->assertOk();

    $invoice->refresh();

    expect($invoice->subtotal)->toEqual(500.0);
    expect($invoice->total_vat)->toEqual(50.0);
    expect($invoice->total_amount)->toEqual(550.0);
    expect($invoice->amount_due)->toEqual(550.0);
    expect($invoice->status)->toBe('pending');
    expect($invoice->items->sum('quantity'))->toBe(5);
    expect($invoice->items->sum('total'))->toEqual(550.0);
});

test('editing a challan clamps paid amount and recomputes status', function () {
    $party = Party::factory()->create();
    $challan = createInvoicedChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $invoice = createChallanInvoice($this, [$challan->id], $party);

    $invoice->update([
        'amount_paid' => 900,
        'amount_due' => 200,
        'status' => 'partial',
    ]);

    $meal = $challan->items()->first()->productMeal;

    $this->put("/api/challans/{$challan->id}", [
        'product_id' => $challan->product_id,
        'date' => $challan->date,
        'address' => '123 Main Street',
        'notes' => null,
        'items' => [[
            'product_meal_id' => $meal->id,
            'quantity' => 5,
        ]],
    ])->assertOk();

    $invoice->refresh();

    expect($invoice->total_amount)->toEqual(550.0);
    expect($invoice->amount_paid)->toEqual(550.0);
    expect($invoice->amount_due)->toEqual(0.0);
    expect($invoice->status)->toBe('paid');
});

test('deleting a challan from a multi-challan invoice detaches and rebuilds', function () {
    $party = Party::factory()->create();
    $challan1 = createInvoicedChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createInvoicedChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);
    $invoice = createChallanInvoice($this, [$challan1->id, $challan2->id], $party);

    expect($invoice->total_amount)->toEqual(2100.0);

    $response = $this->delete("/api/challans/{$challan2->id}");

    $response->assertOk();
    $invoice->refresh();

    expect($invoice->challans->pluck('id')->all())->toBe([$challan1->id]);
    expect($invoice->subtotal)->toEqual(1000.0);
    expect($invoice->total_vat)->toEqual(100.0);
    expect($invoice->total_amount)->toEqual(1100.0);
    expect($invoice->amount_due)->toEqual(1100.0);
});

test('deleting the only challan on an invoice is blocked', function () {
    $party = Party::factory()->create();
    $challan = createInvoicedChallan($party);
    $invoice = createChallanInvoice($this, [$challan->id], $party);

    $response = $this->delete("/api/challans/{$challan->id}");

    $response->assertStatus(422);
    expect($response->json('message'))->toContain($invoice->invoice_number);
    expect(Challan::find($challan->id))->not->toBeNull();
});

test('cancelling a delivered invoiced challan detaches and rebuilds the invoice', function () {
    $party = Party::factory()->create();
    $challan1 = createInvoicedChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createInvoicedChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);
    $invoice = createChallanInvoice($this, [$challan1->id, $challan2->id], $party);

    $response = $this->patch("/api/challans/{$challan2->id}/status", [
        'status' => 'cancelled',
    ]);

    $response->assertOk();
    $invoice->refresh();

    expect($challan2->fresh()->status)->toBe('cancelled');
    expect($invoice->challans->pluck('id')->all())->toBe([$challan1->id]);
    expect($invoice->total_amount)->toEqual(1100.0);
    expect($invoice->amount_due)->toEqual(1100.0);
});
