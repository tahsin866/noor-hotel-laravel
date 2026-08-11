<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailedPurchaseOrdersController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\party\PartyController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Models\Challan;
use App\Models\Party;
use App\Models\Product;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::middleware(['auth', 'verified', 'permission:manage_parties'])->prefix('party')->name('party.')->group(function () {
        Route::get('/', [PartyController::class, 'index'])->name('index');
        Route::post('/', [PartyController::class, 'store']);
    });

    Route::middleware(['permission:manage_products'])->get('po', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/po', [
            'parties' => $parties,
        ]);
    })->name('po');

    Route::middleware(['permission:manage_challans,print_challans'])->get('chalans', function () {
        $products = Product::with(['party', 'meals'])
            ->select('id', 'name', 'code', 'unit', 'party_id')
            ->withSum('meals as total_ordered', 'quantity')
            ->withSum('meals as total_delivered', 'delivered_quantity')
            ->get();
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/chalans', [
            'products' => $products,
            'parties' => $parties,
        ]);
    })->name('chalans');

    Route::middleware(['permission:manage_invoices'])->get('invoices', function () {
        $parties = Party::select('id', 'party_name')->get();
        $products = Product::with(['party'])
            ->select('id', 'name', 'code', 'unit', 'party_id', 'customer_po_number')
            ->get();
        $challans = Challan::with(['product', 'product.party', 'items.productMeal'])
            ->where('status', 'delivered')
            ->whereNotIn('id', function ($query) {
                $query->select('challan_id')->from('invoice_challans');
            })
            ->select('id', 'challan_number', 'product_id', 'date', 'status')
            ->get()
            ->map(function ($c) {
                $items = $c->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'meal_type' => $item->productMeal->meal_type ?? '-',
                        'quantity' => $item->quantity,
                        'description' => $item->productMeal->description ?? '-',
                    ];
                });

                return [
                    'id' => $c->id,
                    'challan_number' => $c->challan_number,
                    'product_id' => $c->product_id,
                    'product_name' => $c->product->name ?? '-',
                    'po_number' => $c->product->code ?? '-',
                    'party_id' => $c->product->party_id ?? null,
                    'party_name' => $c->product->party->party_name ?? '-',
                    'date' => $c->date,
                    'status' => $c->status,
                    'items' => $items,
                ];
            });

        return Inertia::render('noor-hotel/invoice', [
            'parties' => $parties,
            'products' => $products,
            'challans' => $challans,
        ]);
    })->name('invoices');

    Route::middleware(['permission:manage_payments'])->get('payments', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/payment', [
            'parties' => $parties,
        ]);
    })->name('payments');

    Route::get('report', function () {
        return Inertia::render('noor-hotel/reports/report');
    })->name('report');

    Route::get('report/purchase', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/reports/purchase-report', [
            'parties' => $parties,
        ]);
    })->name('report.purchase');

    Route::get('report/challan', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/reports/challan-report', [
            'parties' => $parties,
        ]);
    })->name('report.challan');

    Route::get('report/invoice', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/reports/invoice-report', [
            'parties' => $parties,
        ]);
    })->name('report.invoice');

    Route::get('report/payment', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/reports/payment-report', [
            'parties' => $parties,
        ]);
    })->name('report.payment');

    Route::get('emails', EmailedPurchaseOrdersController::class)->name('emails');

    Route::get('notifications', [NotificationsController::class, 'index'])->name('notifications');
    Route::post('notifications/read-all', [NotificationsController::class, 'readAll'])->name('notifications.read-all');
    Route::post('notifications/{notification}/read', [NotificationsController::class, 'read'])->name('notifications.read');
    Route::delete('notifications/{notification}', [NotificationsController::class, 'destroy'])->name('notifications.destroy');

    Route::get('trash', [TrashController::class, 'index'])->name('trash');
    Route::post('trash/{model}/{id}/restore', [TrashController::class, 'restore'])->name('trash.restore');
    Route::delete('trash/{model}/{id}', [TrashController::class, 'destroy'])->name('trash.destroy');

    Route::middleware(['role:super_admin,admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

        Route::get('permissions', [PermissionController::class, 'index'])->name('permissions.index');
        Route::post('permissions', [PermissionController::class, 'store'])->name('permissions.store');
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy'])->name('permissions.destroy');
    });
});

require __DIR__.'/settings.php';
