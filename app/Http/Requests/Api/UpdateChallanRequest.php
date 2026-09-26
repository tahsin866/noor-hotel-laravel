<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateChallanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'date' => 'required|date',
            'address' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_meal_id' => 'required|exists:product_meals,id',
            'items.*.quantity' => 'required|numeric|min:0',
            'show_print_date' => 'boolean',
        ];
    }
}
