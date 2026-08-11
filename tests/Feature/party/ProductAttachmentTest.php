<?php

use App\Models\Party;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('store creates product with attachment', function () {
    Storage::fake('public');

    $party = Party::factory()->create();

    $response = $this->post('/api/products', [
        'name' => 'Test Product',
        'unit' => 'pcs',
        'vat_rate' => 10,
        'party_id' => $party->id,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
        'attachment' => UploadedFile::fake()->create('po.pdf', 100),
    ]);

    $response->assertCreated();

    $product = Product::query()->first();
    expect($product->attachment_path)->not->toBeNull();

    Storage::disk('public')->assertExists($product->attachment_path);
    $response->assertJsonPath('product.attachment_url', Storage::disk('public')->url($product->attachment_path));
});

test('update replaces attachment and deletes the old file', function () {
    Storage::fake('public');

    $party = Party::factory()->create();
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'attachment_path' => 'product-attachments/old.pdf',
    ]);

    Storage::disk('public')->put('product-attachments/old.pdf', 'old');

    $response = $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
        'attachment' => UploadedFile::fake()->create('new.pdf', 100),
    ]);

    $response->assertOk();

    $product->refresh();
    expect($product->attachment_path)->not->toBe('product-attachments/old.pdf');

    Storage::disk('public')->assertMissing('product-attachments/old.pdf');
    Storage::disk('public')->assertExists($product->attachment_path);
});

test('update can remove the attachment', function () {
    Storage::fake('public');

    $party = Party::factory()->create();
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'attachment_path' => 'product-attachments/old.pdf',
    ]);

    Storage::disk('public')->put('product-attachments/old.pdf', 'old');

    $response = $this->put("/api/products/{$product->id}", [
        'name' => $product->name,
        'unit' => $product->unit,
        'vat_rate' => $product->vat_rate,
        'meals' => [
            ['meal_type' => 'lunch', 'quantity' => 5, 'unit_price' => 100, 'description' => ''],
        ],
        'attachment_remove' => '1',
    ]);

    $response->assertOk();

    $product->refresh();
    expect($product->attachment_path)->toBeNull();
    Storage::disk('public')->assertMissing('product-attachments/old.pdf');
});

test('destroy deletes the attachment file', function () {
    Storage::fake('public');

    $party = Party::factory()->create();
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'attachment_path' => 'product-attachments/keep.pdf',
    ]);

    Storage::disk('public')->put('product-attachments/keep.pdf', 'keep');

    $this->delete("/api/products/{$product->id}")->assertOk();

    Storage::disk('public')->assertMissing('product-attachments/keep.pdf');
    expect(Product::query()->count())->toBe(0);
});
