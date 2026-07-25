<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('party_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->date('date');
            $table->date('due_date');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('total_vat', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->decimal('amount_due', 14, 2)->default(0);
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->integer('quantity')->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('vat_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('invoice_challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('challan_id')->constrained();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_challans');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
