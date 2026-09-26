<?php

namespace App\ValueObjects;

use InvalidArgumentException;

final readonly class ChallanNumber
{
    private function __construct(private string $value) {}

    public static function from(string $value): self
    {
        if (empty($value)) {
            throw new InvalidArgumentException('Challan number cannot be empty.');
        }

        return new self($value);
    }

    public function value(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
