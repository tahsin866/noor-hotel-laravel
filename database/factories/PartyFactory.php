<?php

namespace Database\Factories;

use App\Models\Party;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Party>
 */
class PartyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'party_name' => fake()->company(),
            'party_type' => fake()->randomElement(['supplier', 'customer', 'both', 'hotel']),
            'contact_person' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'agreement_type' => fake()->randomElement(['annual', 'monthly', 'quarterly', 'custom']),
            'start_date' => fake()->date(),
            'end_date' => fake()->optional()->date(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
