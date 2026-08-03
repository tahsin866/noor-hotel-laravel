<?php

namespace Database\Factories;

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\ProductMeal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChallanItem>
 */
class ChallanItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'challan_id' => Challan::factory(),
            'product_meal_id' => ProductMeal::factory(),
            'quantity' => fake()->randomFloat(2, 1, 100),
            'unit_price' => fake()->randomFloat(2, 5, 500),
        ];
    }
}
