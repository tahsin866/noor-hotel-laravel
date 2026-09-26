<?php

namespace App\Contracts;

use App\Models\Challan;

interface ChallanRepositoryInterface
{
    public function find(int $id): ?Challan;
    public function create(array $data): Challan;
    public function update(Challan $challan, array $data): Challan;
    public function delete(Challan $challan): void;
    public function search(array $filters = []): \Illuminate\Pagination\LengthAwarePaginator;
}
