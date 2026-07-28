<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payment_history', function (Blueprint $table) {
            $table->string('payment_status')->nullable()->after('invoice_id');
            $table->string('customer_bank_name')->nullable()->after('notes');
            $table->string('user_bank_name')->nullable()->after('customer_bank_name');
            $table->string('attachment')->nullable()->after('user_bank_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_history', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'customer_bank_name', 'user_bank_name', 'attachment']);
        });
    }
};
