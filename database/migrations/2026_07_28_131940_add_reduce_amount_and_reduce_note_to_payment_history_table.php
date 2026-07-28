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
            $table->decimal('reduce_amount', 14, 2)->nullable()->after('notes');
            $table->text('reduce_note')->nullable()->after('reduce_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_history', function (Blueprint $table) {
            $table->dropColumn(['reduce_amount', 'reduce_note']);
        });
    }
};
