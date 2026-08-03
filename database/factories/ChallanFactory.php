<?php

namespace Database\Factories;

use App\Models\Challan;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Challan>
 */
class ChallanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
            'date' => fake()->date(),
            'address' => fake()->address(),
            'notes' => fake()->optional()->sentence(),
            'total_amount' => fake()->randomFloat(2, 100, 100000),
            'status' => fake()->randomElement(['pending', 'dispatched', 'delivered', 'cancelled']),
        ];
    }
}
