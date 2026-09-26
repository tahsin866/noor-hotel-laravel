<?php

namespace App\Contracts;

use App\Models\Party;

interface PartyRepositoryInterface
{
    public function find(int $id): ?Party;
    public function create(array $data): Party;
    public function update(Party $party, array $data): Party;
    public function delete(Party $party): void;
    public function search(string $query, array $filters = []): \Illuminate\Pagination\LengthAwarePaginator;
}
