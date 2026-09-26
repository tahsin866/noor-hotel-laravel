<?php

namespace App\DTOs;

final readonly class CreatePartyDTO
{
    public function __construct(
        public string $partyName,
        public ?string $partyType,
        public ?string $contactPerson,
        public ?string $contactPersonDesignation,
        public ?string $phone,
        public ?string $email,
        public ?string $address,
        public ?string $agreementType,
        public ?string $startDate,
        public ?string $endDate,
        public ?string $notes,
    ) {}
}
