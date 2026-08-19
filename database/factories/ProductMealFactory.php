<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductMeal>
 */
class ProductMealFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'meal_type' => fake()->randomElement(['breakfast', 'lunch', 'dinner', 'snacks', 'morning_snacks', 'evening_snacks', 'hot_meal']),
            'quantity' => fake()->numberBetween(1, 100),
            'unit_price' => fake()->randomFloat(2, 5, 200),
            'delivered_quantity' => fake()->numberBetween(0, 100),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
