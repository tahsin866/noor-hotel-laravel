<?php

namespace App\Repositories\Eloquent;

use App\Contracts\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Pagination\LengthAwarePaginator;

class EloquentProductRepository implements ProductRepositoryInterface
{
    public function __construct(private Product $model) {}

    public function find(int $id): ?Product
    {
        return $this->model->find($id);
    }

    public function create(array $data): Product
    {
        return $this->model->create($data);
    }

    public function update(Product $product, array $data): Product
    {
        $product->update($data);

        return $product->refresh();
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function search(array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->query()
            ->select('products.*')
            ->leftJoin('parties', 'products.party_id', '=', 'parties.id')
            ->addSelect('parties.party_name')
            ->withDeliveredTotals()
            ->withCount([
                'challans as challans_count' => function ($q) {
                    $q->where('status', '!=', 'cancelled');
                },
                'challans as invoiced_challans_count' => function ($q) {
                    $q->whereHas('invoices');
                },
            ]);

        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $query->where($key, $value);
            }
        }

        return $query->orderByDesc('products.id')->paginate(10);
    }
}
