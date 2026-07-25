<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challans', function (Blueprint $table) {
            $table->id();
            $table->string('challan_number')->unique();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('status', ['pending', 'dispatched', 'delivered', 'cancelled'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challans');
    }
};
