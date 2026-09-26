<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'payment_date' => $this->payment_date,
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'payment_status' => $this->payment_status,
            'customer_bank_name' => $this->customer_bank_name,
            'user_bank_name' => $this->user_bank_name,
            'attachment' => $this->attachment,
            'reduce_amount' => $this->reduce_amount,
            'reduce_note' => $this->reduce_note,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
