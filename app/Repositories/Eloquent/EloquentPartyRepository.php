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

    /**
     * @param  array{party_type?: string, agreement_type?: string, end_date_from?: string, end_date_to?: string}  $filters
     */
    public function search(string $query, array $filters = [], int $perPage = 10): LengthAwarePaginator
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

        foreach (['party_type', 'agreement_type'] as $column) {
            if (! empty($filters[$column])) {
                $queryBuilder->where($column, $filters[$column]);
            }
        }

        if (! empty($filters['end_date_from'])) {
            $queryBuilder->whereDate('end_date', '>=', $filters['end_date_from']);
        }

        if (! empty($filters['end_date_to'])) {
            $queryBuilder->whereDate('end_date', '<=', $filters['end_date_to']);
        }

        return $queryBuilder->latest()->paginate($perPage)->withQueryString();
    }
}
