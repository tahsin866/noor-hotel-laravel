<?php

namespace App\Http\Controllers;

use App\Models\Challan;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $totalParties = Party::count();
        $totalProducts = Product::count();
        $totalChallans = Challan::count();
        $deliveredChallans = Challan::where('status', 'delivered')->count();
        $totalInvoices = Invoice::count();
        $deliveredAmount = round((float) Challan::where('status', 'delivered')->sum('total_amount'), 2);
        $dispatchedAmount = round((float) Challan::where('status', 'dispatched')->sum('total_amount'), 2);
        $totalRevenue = round($deliveredAmount + $dispatchedAmount, 2);
        $totalPaid = Invoice::sum('amount_paid');
        $totalDue = round($totalRevenue - $totalPaid, 2);

        $challanByStatus = Challan::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $invoiceByStatus = Invoice::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $monthlyChallans = Challan::select(
            DB::raw((DB::getDriverName() === 'sqlite' ? "strftime('%Y-%m', date)" : "to_char(date, 'YYYY-MM')").' as month'),
            DB::raw('count(*) as total')
        )
            ->groupBy('month')
            ->orderBy('month')
            ->limit(6)
            ->pluck('total', 'month');

        $monthlyInvoices = Invoice::select(
            DB::raw((DB::getDriverName() === 'sqlite' ? "strftime('%Y-%m', date)" : "to_char(date, 'YYYY-MM')").' as month'),
            DB::raw('count(*) as total')
        )
            ->groupBy('month')
            ->orderBy('month')
            ->limit(6)
            ->pluck('total', 'month');

        $monthlyRevenue = Invoice::select(
            DB::raw((DB::getDriverName() === 'sqlite' ? "strftime('%Y-%m', date)" : "to_char(date, 'YYYY-MM')").' as month'),
            DB::raw('sum(total_amount) as total')
        )
            ->groupBy('month')
            ->orderBy('month')
            ->limit(6)
            ->pluck('total', 'month');

        $recentChallans = Challan::with(['product', 'product.party'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'challan_number' => $c->challan_number,
                'product_name' => $c->product->name ?? '-',
                'party_name' => $c->product->party->party_name ?? '-',
                'date' => $c->date,
                'status' => $c->status,
                'total_amount' => $c->total_amount,
            ]);

        $recentInvoices = Invoice::with(['party'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'invoice_number' => $i->invoice_number,
                'party_name' => $i->party->party_name ?? '-',
                'date' => $i->date,
                'total_amount' => $i->total_amount,
                'amount_paid' => $i->amount_paid,
                'amount_due' => $i->amount_due,
                'status' => $i->status,
            ]);

        return Inertia::render('dashboard', [
            'stats' => [
                'totalParties' => $totalParties,
                'totalProducts' => $totalProducts,
                'totalChallans' => $totalChallans,
                'deliveredChallans' => $deliveredChallans,
                'totalInvoices' => $totalInvoices,
                'totalRevenue' => $totalRevenue,
                'totalPaid' => $totalPaid,
                'totalDue' => $totalDue,
            ],
            'challanByStatus' => $challanByStatus,
            'invoiceByStatus' => $invoiceByStatus,
            'monthlyChallans' => $monthlyChallans,
            'monthlyInvoices' => $monthlyInvoices,
            'monthlyRevenue' => $monthlyRevenue,
            'recentChallans' => $recentChallans,
            'recentInvoices' => $recentInvoices,
        ]);
    }
}
