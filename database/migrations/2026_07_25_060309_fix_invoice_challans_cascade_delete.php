<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_challans', function (Blueprint $table) {
            $table->dropForeign('invoice_challans_challan_id_foreign');
            $table->foreign('challan_id')->references('id')->on('challans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoice_challans', function (Blueprint $table) {
            $table->dropForeign('invoice_challans_challan_id_foreign');
            $table->foreign('challan_id')->references('id')->on('challans');
        });
    }
};
