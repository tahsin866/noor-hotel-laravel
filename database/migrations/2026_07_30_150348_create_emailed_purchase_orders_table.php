<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emailed_purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('message_id')->unique()->index();
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->string('subject');
            $table->longText('body')->nullable();
            $table->longText('html_body')->nullable();
            $table->dateTime('email_date');
            $table->string('type')->default('general')->index(); // purchase_order, deadline, general
            $table->string('status')->default('new')->index(); // new, read, archived
            $table->string('po_number')->nullable()->index();
            $table->date('po_date')->nullable();
            $table->dateTime('deadline')->nullable();
            $table->string('supplier_name')->nullable();
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->string('currency', 10)->nullable();
            $table->text('notes')->nullable();
            $table->json('raw_analysis')->nullable();
            $table->dateTime('imported_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emailed_purchase_orders');
    }
};
