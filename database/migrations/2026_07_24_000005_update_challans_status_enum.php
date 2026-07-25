<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE challans SET status = 'pending' WHERE status = 'draft'");
        DB::statement("ALTER TABLE challans ALTER COLUMN status SET DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("UPDATE challans SET status = 'draft' WHERE status = 'pending'");
        DB::statement("ALTER TABLE challans ALTER COLUMN status SET DEFAULT 'draft'");
    }
};
