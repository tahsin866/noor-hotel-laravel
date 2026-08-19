<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('product_meals')
            ->where('meal_type', 'snack')
            ->update(['meal_type' => 'snacks']);
    }

    public function down(): void
    {
        DB::table('product_meals')
            ->where('meal_type', 'snacks')
            ->update(['meal_type' => 'snack']);
    }
};
