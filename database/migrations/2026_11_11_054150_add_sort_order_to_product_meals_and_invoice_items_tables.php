<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Record the entry order of PO lines and invoice lines so invoices keep the PO's item sequence.
     */
    public function up(): void
    {
        Schema::table('product_meals', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('product_id');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('invoice_id');
        });

        DB::table('product_meals')->update(['sort_order' => DB::raw('id')]);
        DB::table('invoice_items')->update(['sort_order' => DB::raw('id')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_meals', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
