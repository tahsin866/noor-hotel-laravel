<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'party_name' => $this->party_name,
            'party_type' => $this->party_type,
            'contact_person' => $this->contact_person,
            'contact_person_designation' => $this->contact_person_designation,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'agreement_type' => $this->agreement_type,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
