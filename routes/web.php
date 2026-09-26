<?php

use App\Http\Controllers\ChallanPageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailedPurchaseOrdersController;
use App\Http\Controllers\InvoicePageController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PaymentPageController;
use App\Http\Controllers\PoController;
use App\Http\Controllers\PartyController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::middleware(['auth', 'verified', 'permission:manage_parties'])->prefix('party')->name('party.')->group(function () {
        Route::get('/', [PartyController::class, 'index'])->name('index');
        Route::post('/', [PartyController::class, 'store']);
    });

    Route::middleware(['permission:manage_products'])->get('po', PoController::class)->name('po');

    Route::middleware(['permission:manage_challans,print_challans'])->get('chalans', ChallanPageController::class)->name('chalans');

    Route::middleware(['permission:manage_invoices'])->get('invoices', InvoicePageController::class)->name('invoices');

    Route::middleware(['permission:manage_payments'])->get('payments', PaymentPageController::class)->name('payments');

    Route::get('report', function () {
        return Inertia::render('noor-hotel/reports/report');
    })->name('report');

    Route::get('report/purchase', function () {
        return Inertia::render('noor-hotel/reports/purchase-report', [
            'parties' => \App\Models\Party::select('id', 'party_name')->get(),
        ]);
    })->name('report.purchase');

    Route::get('report/challan', function () {
        return Inertia::render('noor-hotel/reports/challan-report', [
            'parties' => \App\Models\Party::select('id', 'party_name')->get(),
        ]);
    })->name('report.challan');

    Route::get('report/invoice', function () {
        return Inertia::render('noor-hotel/reports/invoice-report', [
            'parties' => \App\Models\Party::select('id', 'party_name')->get(),
        ]);
    })->name('report.invoice');

    Route::get('report/payment', function () {
        return Inertia::render('noor-hotel/reports/payment-report', [
            'parties' => \App\Models\Party::select('id', 'party_name')->get(),
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
