<?php

namespace App\ValueObjects;

use InvalidArgumentException;

final readonly class Money
{
    public function __construct(
        private int $amountInCents,
        private string $currency = 'BDT',
    ) {
        if ($amountInCents < 0) {
            throw new InvalidArgumentException('Amount cannot be negative.');
        }
    }

    public static function fromDecimal(float $amount, string $currency = 'BDT'): self
    {
        return new self((int) round($amount * 100), $currency);
    }

    public static function fromCents(int $cents, string $currency = 'BDT'): self
    {
        return new self($cents, $currency);
    }

    public function toCents(): int
    {
        return $this->amountInCents;
    }

    public function toDecimal(): float
    {
        return round($this->amountInCents / 100, 2);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->amountInCents + $other->amountInCents, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self(max(0, $this->amountInCents - $other->amountInCents), $this->currency);
    }

    public function multiply(float $multiplier): self
    {
        return new self((int) round($this->amountInCents * $multiplier), $this->currency);
    }

    public function isGreaterThan(self $other): bool
    {
        $this->assertSameCurrency($other);

        return $this->amountInCents > $other->amountInCents;
    }

    public function isLessThan(self $other): bool
    {
        $this->assertSameCurrency($other);

        return $this->amountInCents < $other->amountInCents;
    }

    public function isZero(): bool
    {
        return $this->amountInCents === 0;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException('Currency mismatch.');
        }
    }
}
