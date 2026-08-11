<?php

use App\Http\Controllers\party\ChallanController;
use App\Http\Controllers\party\InvoiceController;
use App\Http\Controllers\party\PartyController;
use App\Http\Controllers\party\ProductController;
use App\Http\Controllers\reports\ChallanReportController;
use App\Http\Controllers\reports\InvoiceReportController;
use App\Http\Controllers\reports\PaymentReportController;
use App\Http\Controllers\reports\PurchaseReportController;
use Illuminate\Support\Facades\Route;

Route::post('party', [PartyController::class, 'store']);
Route::put('party/{party}', [PartyController::class, 'update']);
Route::delete('party/{party}', [PartyController::class, 'destroy']);
Route::get('party/{party}/print', [PartyController::class, 'print']);

Route::get('products', [ProductController::class, 'index']);
Route::post('products', [ProductController::class, 'store']);
Route::get('products/{product}/print', [ProductController::class, 'print']);
Route::get('products/{product}', [ProductController::class, 'show']);
Route::put('products/{product}', [ProductController::class, 'update']);
Route::delete('products/{product}', [ProductController::class, 'destroy']);

Route::get('challans', [ChallanController::class, 'index']);
Route::post('challans', [ChallanController::class, 'store']);
Route::post('challans/print-batch', [ChallanController::class, 'printBatch']);
Route::get('challans/{id}', [ChallanController::class, 'show']);
Route::put('challans/{id}', [ChallanController::class, 'update']);
Route::delete('challans/{id}', [ChallanController::class, 'destroy']);
Route::patch('challans/{id}/status', [ChallanController::class, 'updateStatus']);
Route::get('challans/{id}/print', [ChallanController::class, 'print']);

Route::get('invoices', [InvoiceController::class, 'index']);
Route::post('invoices', [InvoiceController::class, 'store']);
Route::get('invoices/{id}', [InvoiceController::class, 'show']);
Route::put('invoices/{id}', [InvoiceController::class, 'update']);
Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);
Route::get('invoices/{id}/print', [InvoiceController::class, 'print']);
Route::post('invoices/{id}/mark-printed', [InvoiceController::class, 'markPrinted']);
Route::patch('invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
Route::get('invoices/{id}/payment-history', [InvoiceController::class, 'paymentHistory']);
Route::get('payments/report', [InvoiceController::class, 'report']);
Route::post('payments/bulk', [InvoiceController::class, 'bulkPayment']);

Route::get('reports/purchase', [PurchaseReportController::class, 'index']);
Route::get('reports/challan', [ChallanReportController::class, 'index']);
Route::get('reports/invoice', [InvoiceReportController::class, 'index']);
Route::get('reports/payment', [PaymentReportController::class, 'index']);
