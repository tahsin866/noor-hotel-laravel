<?php

namespace App\Repositories\Eloquent;

use App\Contracts\InvoiceRepositoryInterface;
use App\Models\Invoice;
use Illuminate\Pagination\LengthAwarePaginator;

class EloquentInvoiceRepository implements InvoiceRepositoryInterface
{
    public function __construct(private Invoice $model) {}

    public function find(int $id): ?Invoice
    {
        return $this->model->find($id);
    }

    public function create(array $data): Invoice
    {
        return $this->model->create($data);
    }

    public function update(Invoice $invoice, array $data): Invoice
    {
        $invoice->update($data);

        return $invoice->refresh();
    }

    public function delete(Invoice $invoice): void
    {
        $invoice->delete();
    }

    public function search(array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->with(['party', 'items.product', 'paymentHistory', 'challans']);

        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $query->where($key, $value);
            }
        }

        return $query->latest()->paginate(10);
    }
}
