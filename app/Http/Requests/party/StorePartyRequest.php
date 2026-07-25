<?php

namespace App\Http\Requests\party;

use Illuminate\Foundation\Http\FormRequest;

class StorePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'party_name' => 'required|string|max:255',
            'party_type' => 'required|string|in:supplier,customer,both,hotel',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'agreement_type' => 'nullable|string|in:annual,monthly,quarterly,custom',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }
}
