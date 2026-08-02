<?php

require dirname(__DIR__).'/vendor/autoload.php';

$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$tables = ['products', 'product_meals', 'parties', 'challans', 'challan_items', 'invoices', 'invoice_items', 'payment_history', 'emailed_purchase_orders'];

foreach ($tables as $table) {
    $columns = DB::select(
        'SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
        ['public', $table]
    );
    echo "=== $table ===\n";
    foreach ($columns as $col) {
        echo "  {$col->column_name} | {$col->data_type} | nullable={$col->is_nullable} | default={$col->column_default}\n";
    }
    echo "\n";
}
