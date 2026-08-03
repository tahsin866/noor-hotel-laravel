<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\PaymentHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentHistory>
 */
class PaymentHistoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'invoice_id' => Invoice::factory(),
            'amount' => fake()->randomFloat(2, 100, 10000),
            'payment_date' => fake()->date(),
            'payment_method' => fake()->randomElement(['cash', 'bank_transfer', 'cheque', 'mobile']),
            'reference_number' => fake()->optional()->bothify('??-####'),
            'notes' => fake()->optional()->sentence(),
            'payment_status' => fake()->randomElement(['paid', 'partial', 'due']),
            'customer_bank_name' => fake()->optional()->company(),
            'user_bank_name' => fake()->optional()->company(),
            'attachment' => null,
            'reduce_amount' => fake()->randomFloat(2, 0, 500),
            'reduce_note' => fake()->optional()->sentence(),
        ];
    }
}
