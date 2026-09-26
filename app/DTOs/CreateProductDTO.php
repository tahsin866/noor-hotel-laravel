<?php

namespace App\DTOs;

final readonly class CreateProductDTO
{
    public function __construct(
        public string $code,
        public string $name,
        public string $unit,
        public ?float $vatRate,
        public ?int $partyId,
        public ?string $customerPoNumber,
        public ?string $description,
        public ?string $attachmentPath,
        public ?\DateTimeInterface $reminderAt,
        public array $meals,
    ) {}
}
