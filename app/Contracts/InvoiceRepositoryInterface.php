<?php

namespace App\Contracts;

use App\Models\Invoice;

interface InvoiceRepositoryInterface
{
    public function find(int $id): ?Invoice;
    public function create(array $data): Invoice;
    public function update(Invoice $invoice, array $data): Invoice;
    public function delete(Invoice $invoice): void;
    public function search(array $filters = []): \Illuminate\Pagination\LengthAwarePaginator;
}
