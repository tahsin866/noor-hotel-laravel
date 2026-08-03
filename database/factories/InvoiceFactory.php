<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Party;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'party_id' => Party::factory(),
            'user_id' => User::factory(),
            'date' => fake()->date(),
            'due_date' => fake()->date('Y-m-d', '+30 days'),
            'subtotal' => 0,
            'total_vat' => 0,
            'total_amount' => 0,
            'amount_paid' => 0,
            'amount_due' => 0,
            'status' => fake()->randomElement(['pending', 'partial', 'paid', 'overdue']),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
