<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'vat_rate' => 'nullable|numeric|min:0',
            'party_id' => 'nullable|exists:parties,id',
            'customer_po_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'reminder_at' => 'nullable|date',
            'attachment' => 'nullable|file|max:10240',
            'meals' => 'required|array|min:1',
            'meals.*.id' => 'nullable|integer|exists:product_meals,id',
            'meals.*.meal_type' => 'required|string|in:breakfast,lunch,dinner,snacks,morning_snacks,evening_snacks,hot_meal',
            'meals.*.quantity' => 'required|integer|min:0',
            'meals.*.unit_price' => 'required|numeric|min:0',
            'meals.*.description' => 'nullable|string',
        ];
    }
}
