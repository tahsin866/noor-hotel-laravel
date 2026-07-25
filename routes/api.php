<?php

use App\Http\Controllers\party\ChallanController;
use App\Http\Controllers\party\InvoiceController;
use App\Http\Controllers\party\PartyController;
use App\Http\Controllers\party\ProductController;
use Illuminate\Support\Facades\Route;

Route::post('party', [PartyController::class, 'store']);
Route::put('party/{party}', [PartyController::class, 'update']);
Route::delete('party/{party}', [PartyController::class, 'destroy']);

Route::get('products', [ProductController::class, 'index']);
Route::post('products', [ProductController::class, 'store']);
Route::get('products/{product}', [ProductController::class, 'show']);
Route::put('products/{product}', [ProductController::class, 'update']);
Route::delete('products/{product}', [ProductController::class, 'destroy']);

Route::get('challans', [ChallanController::class, 'index']);
Route::post('challans', [ChallanController::class, 'store']);
Route::get('challans/{id}', [ChallanController::class, 'show']);
Route::put('challans/{id}', [ChallanController::class, 'update']);
Route::delete('challans/{id}', [ChallanController::class, 'destroy']);
Route::patch('challans/{id}/status', [ChallanController::class, 'updateStatus']);
Route::get('challans/{id}/print', [ChallanController::class, 'print']);

Route::get('invoices', [InvoiceController::class, 'index']);
Route::post('invoices', [InvoiceController::class, 'store']);
Route::get('invoices/{id}', [InvoiceController::class, 'show']);
Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);
Route::get('invoices/{id}/print', [InvoiceController::class, 'print']);
Route::patch('invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
Route::get('invoices/{id}/payment-history', [InvoiceController::class, 'paymentHistory']);
Route::get('payments/report', [InvoiceController::class, 'report']);
