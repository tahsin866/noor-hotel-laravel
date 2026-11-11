<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Give every payment its own serial (Noor/{year}/PAY/0001), numbered per year in the order payments were recorded.
     */
    public function up(): void
    {
        Schema::table('payment_history', function (Blueprint $table) {
            $table->string('payment_number')->nullable()->unique()->after('id');
        });

        $nextNumberByYear = [];

        DB::table('payment_history')
            ->orderBy('created_at')
            ->orderBy('id')
            ->select(['id', 'created_at', 'payment_date'])
            ->get()
            ->each(function (object $payment) use (&$nextNumberByYear): void {
                $year = Carbon::parse($payment->created_at ?? $payment->payment_date ?? now())->year;
                $nextNumberByYear[$year] = ($nextNumberByYear[$year] ?? 0) + 1;

                DB::table('payment_history')
                    ->where('id', $payment->id)
                    ->update(['payment_number' => "Noor/{$year}/PAY/".str_pad((string) $nextNumberByYear[$year], 4, '0', STR_PAD_LEFT)]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_history', function (Blueprint $table) {
            $table->dropUnique(['payment_number']);
            $table->dropColumn('payment_number');
        });
    }
};
