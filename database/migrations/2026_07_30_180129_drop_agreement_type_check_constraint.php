<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_agreement_type_check');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE parties ADD CONSTRAINT parties_agreement_type_check CHECK (agreement_type::text = ANY (ARRAY['annual'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'custom'::character varying]::text[]))");
        }
    }
};
