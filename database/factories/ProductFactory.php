<?php

namespace Database\Factories;

use App\Models\Party;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'PO-'.str_pad((Product::max('id') ?? 0) + 1, 4, '0', STR_PAD_LEFT),
            'name' => fake()->words(3, true),
            'unit' => fake()->randomElement(['pcs', 'kg', 'g', 'liter', 'box', 'pack']),
            'vat_rate' => fake()->randomElement([0, 5, 10, 15, 20]),
            'unit_price' => fake()->randomFloat(2, 10, 500),
            'party_id' => Party::factory(),
            'customer_po_number' => fake()->optional()->bothify('PO-#####'),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
