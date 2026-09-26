<?php

namespace App\Services;

use App\Contracts\PartyRepositoryInterface;
use App\DTOs\CreatePartyDTO;
use App\DTOs\UpdatePartyDTO;
use App\Models\Party;
use App\ValueObjects\Money;

class PartyService
{
    public function __construct(private PartyRepositoryInterface $parties) {}

    public function create(CreatePartyDTO $dto): Party
    {
        $data = [
            'party_name' => $dto->partyName,
            'party_type' => $dto->partyType,
            'contact_person' => $dto->contactPerson,
            'contact_person_designation' => $dto->contactPersonDesignation,
            'phone' => $dto->phone,
            'email' => $dto->email,
            'address' => $dto->address,
            'agreement_type' => $dto->agreementType,
            'start_date' => $dto->startDate,
            'end_date' => $dto->endDate,
            'notes' => $dto->notes,
        ];

        return $this->parties->create(array_filter($data, fn ($value) => $value !== null));
    }

    public function update(Party $party, UpdatePartyDTO $dto): Party
    {
        $data = array_filter([
            'party_name' => $dto->partyName,
            'party_type' => $dto->partyType,
            'contact_person' => $dto->contactPerson,
            'contact_person_designation' => $dto->contactPersonDesignation,
            'phone' => $dto->phone,
            'email' => $dto->email,
            'address' => $dto->address,
            'agreement_type' => $dto->agreementType,
            'start_date' => $dto->startDate,
            'end_date' => $dto->endDate,
            'notes' => $dto->notes,
        ], fn ($value) => $value !== null);

        return $this->parties->update($party, $data);
    }

    public function delete(Party $party): void
    {
        $this->parties->delete($party);
    }

    public function search(string $query, array $filters = []): \Illuminate\Pagination\LengthAwarePaginator
    {
        return $this->parties->search($query, $filters);
    }
}
