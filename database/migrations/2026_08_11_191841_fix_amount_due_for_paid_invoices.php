<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('invoices')
            ->where('status', 'paid')
            ->where('amount_due', '>', 0)
            ->update(['amount_due' => 0]);
    }

    public function down(): void
    {
        DB::table('invoices')
            ->where('status', 'paid')
            ->where('amount_due', 0)
            ->whereColumn('amount_paid', '<', 'total_amount')
            ->update([
                'amount_due' => DB::raw('total_amount - amount_paid'),
            ]);
    }
};
