<?php

namespace App\Providers;

use App\Repositories\Eloquent\EloquentChallanRepository;
use App\Repositories\Eloquent\EloquentInvoiceRepository;
use App\Repositories\Eloquent\EloquentPartyRepository;
use App\Repositories\Eloquent\EloquentProductRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \App\Contracts\PartyRepositoryInterface::class,
            EloquentPartyRepository::class,
        );

        $this->app->bind(
            \App\Contracts\ProductRepositoryInterface::class,
            EloquentProductRepository::class,
        );

        $this->app->bind(
            \App\Contracts\ChallanRepositoryInterface::class,
            EloquentChallanRepository::class,
        );

        $this->app->bind(
            \App\Contracts\InvoiceRepositoryInterface::class,
            EloquentInvoiceRepository::class,
        );
    }
}
