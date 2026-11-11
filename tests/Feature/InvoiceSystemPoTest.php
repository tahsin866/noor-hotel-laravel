<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductMeal;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createDeliveredChallanForPo(Product $product): Challan
{
    $meal = ProductMeal::factory()->create(['product_id' => $product->id, 'unit_price' => 100]);
    $challan = Challan::factory()->create(['product_id' => $product->id, 'status' => 'delivered']);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => 5,
        'unit_price' => 100,
    ]);

    return $challan;
}

test('invoice list returns every system PO the invoice was made from', function () {
    $party = Party::factory()->create();
    $firstPo = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0101']);
    $secondPo = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0102']);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'challan_ids' => [
            createDeliveredChallanForPo($firstPo)->id,
            createDeliveredChallanForPo($secondPo)->id,
            createDeliveredChallanForPo($firstPo)->id,
        ],
    ])->assertOk();

    $listed = collect($this->getJson('/api/invoices')->json('data.items'))
        ->firstWhere('id', Invoice::query()->sole()->id);

    expect($listed['system_pos'])->toBe([
        ['id' => $firstPo->id, 'code' => 'PO-0101'],
        ['id' => $secondPo->id, 'code' => 'PO-0102'],
    ]);
});

test('invoice list can be searched by system PO number', function () {
    $party = Party::factory()->create();
    $po = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0777']);
    $other = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0888']);

    foreach ([$po, $other] as $product) {
        $challan = createDeliveredChallanForPo($product);
        $this->post('/api/invoices', [
            'party_id' => $party->id,
            'date' => '2026-01-10',
            'due_date' => '2026-02-10',
            'challan_ids' => [$challan->id],
        ])->assertOk();
    }

    $codes = collect($this->getJson('/api/invoices?search=PO-0777')->json('data.items'))
        ->pluck('system_pos.0.code')
        ->all();

    expect($codes)->toBe(['PO-0777']);
});

test('opening the PO page from a system PO link focuses that PO', function () {
    $permission = Permission::firstOrCreate(['name' => 'manage_products']);
    $role = Role::firstOrCreate(['name' => 'test_po_viewer']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $po = Product::factory()->create(['code' => 'PO-0297']);

    $this->actingAs($user)
        ->get("/po?po={$po->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/po')
            ->where('focusPo.id', $po->id)
            ->where('focusPo.code', 'PO-0297'));

    $this->actingAs($user)
        ->get('/po')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('focusPo', null));
});

test('PO list and PO responses show the invoices raised from that PO', function () {
    $party = Party::factory()->create();
    $po = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0500']);
    $uninvoicedPo = Product::factory()->create(['party_id' => $party->id, 'code' => 'PO-0501']);
    createDeliveredChallanForPo($uninvoicedPo);

    foreach (range(1, 2) as $i) {
        $this->post('/api/invoices', [
            'party_id' => $party->id,
            'date' => '2026-01-10',
            'due_date' => '2026-02-10',
            'challan_ids' => [createDeliveredChallanForPo($po)->id],
        ])->assertOk();
    }

    $expected = Invoice::query()->orderBy('id')->get()
        ->map(fn (Invoice $invoice) => ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number])
        ->all();

    $listed = collect($this->getJson('/api/products')->json('items'))->keyBy('code');
    expect($listed['PO-0500']['invoices'])->toBe($expected);
    expect($listed['PO-0501']['invoices'])->toBe([]);

    expect($this->getJson("/api/products/{$po->id}")->json('invoices'))->toBe($expected);

    $searched = collect($this->getJson('/api/products?search='.urlencode($expected[0]['invoice_number']))->json('items'))
        ->pluck('code')
        ->all();
    expect($searched)->toBe(['PO-0500']);
});

test('opening the invoices page from a PO invoice link focuses that invoice', function () {
    $permission = Permission::firstOrCreate(['name' => 'manage_invoices']);
    $role = Role::firstOrCreate(['name' => 'test_invoice_viewer']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $invoice = Invoice::factory()->create();

    $this->actingAs($user)
        ->get("/invoices?invoice={$invoice->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/invoice')
            ->where('focusInvoice.id', $invoice->id)
            ->where('focusInvoice.invoice_number', $invoice->invoice_number));
});
