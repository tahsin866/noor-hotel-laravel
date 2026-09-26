<?php

namespace App\DTOs;

final readonly class CreateChallanDTO
{
    public function __construct(
        public int $productId,
        public int $userId,
        public string $date,
        public string $address,
        public ?string $notes,
        public array $items,
        public bool $showPrintDate,
    ) {}
}
