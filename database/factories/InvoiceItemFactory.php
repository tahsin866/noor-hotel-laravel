<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 50);
        $unitPrice = fake()->randomFloat(2, 10, 500);
        $vatRate = fake()->randomElement([0, 5, 10, 15]);
        $vatAmount = round($quantity * $unitPrice * $vatRate / 100, 2);

        return [
            'invoice_id' => Invoice::factory(),
            'product_id' => Product::factory(),
            'meal_type' => fake()->randomElement(['breakfast', 'lunch', 'dinner', 'snack']),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'total' => round($quantity * $unitPrice + $vatAmount, 2),
        ];
    }
}
