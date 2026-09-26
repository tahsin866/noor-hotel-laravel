<?php

namespace App\Repositories\Eloquent;

use App\Contracts\ChallanRepositoryInterface;
use App\Models\Challan;
use Illuminate\Pagination\LengthAwarePaginator;

class EloquentChallanRepository implements ChallanRepositoryInterface
{
    public function __construct(private Challan $model) {}

    public function find(int $id): ?Challan
    {
        return $this->model->find($id);
    }

    public function create(array $data): Challan
    {
        return $this->model->create($data);
    }

    public function update(Challan $challan, array $data): Challan
    {
        $challan->update($data);

        return $challan->refresh();
    }

    public function delete(Challan $challan): void
    {
        $challan->delete();
    }

    public function search(array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->with(['product', 'product.party', 'user', 'items']);

        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $query->where($key, $value);
            }
        }

        return $query->latest()->paginate(10);
    }
}
