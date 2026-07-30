<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE challans SET status = 'pending' WHERE status = 'draft'");

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE challans ALTER COLUMN status SET DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        DB::statement("UPDATE challans SET status = 'draft' WHERE status = 'pending'");

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE challans ALTER COLUMN status SET DEFAULT 'draft'");
        }
    }
};
