<?php

namespace App\Repositories\Eloquent;

use App\Contracts\PartyRepositoryInterface;
use App\Models\Party;
use Illuminate\Pagination\LengthAwarePaginator;

class EloquentPartyRepository implements PartyRepositoryInterface
{
    public function __construct(private Party $model) {}

    public function find(int $id): ?Party
    {
        return $this->model->find($id);
    }

    public function create(array $data): Party
    {
        return $this->model->create($data);
    }

    public function update(Party $party, array $data): Party
    {
        $party->update($data);

        return $party->refresh();
    }

    public function delete(Party $party): void
    {
        $party->delete();
    }

    public function search(string $query, array $filters = []): LengthAwarePaginator
    {
        $queryBuilder = $this->model->query();

        if ($query) {
            $queryBuilder->where(function ($q) use ($query) {
                $q->where('party_name', 'like', "%{$query}%")
                    ->orWhere('contact_person', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%");
            });
        }

        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $queryBuilder->where($key, $value);
            }
        }

        return $queryBuilder->latest()->paginate(10);
    }
}
