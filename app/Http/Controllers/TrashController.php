<?php

namespace App\Http\Controllers;

use App\Models\Challan;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class TrashController extends Controller
{
    public function index(): Response
    {
        $parties = Party::onlyTrashed()->orderByDesc('deleted_at')->get();
        $products = Product::onlyTrashed()->with('party')->orderByDesc('deleted_at')->get();
        $challans = Challan::onlyTrashed()->with(['product.party'])->orderByDesc('deleted_at')->get();
        $invoices = Invoice::onlyTrashed()->with('party')->orderByDesc('deleted_at')->get();
        $payments = PaymentHistory::onlyTrashed()->with(['invoice.party'])->orderByDesc('deleted_at')->get();

        return Inertia::render('noor-hotel/trash', [
            'items' => [
                'parties' => $parties->map(fn (Party $p) => [
                    'id' => $p->id,
                    'name' => $p->party_name,
                    'sub' => null,
                    'meta' => null,
                    'deleted_at' => $p->deleted_at?->format('Y-m-d H:i:s'),
                ])->values(),
                'products' => $products->map(fn (Product $p) => [
                    'id' => $p->id,
                    'name' => $p->code . ' — ' . $p->name,
                    'sub' => $p->party->party_name ?? '-',
                    'meta' => 'Unit: ' . $p->unit,
                    'deleted_at' => $p->deleted_at?->format('Y-m-d H:i:s'),
                ])->values(),
                'challans' => $challans->map(fn (Challan $c) => [
                    'id' => $c->id,
                    'name' => $c->challan_number,
                    'sub' => ($c->product->name ?? '-') . ' — ' . ($c->product?->party?->party_name ?? '-'),
                    'meta' => ucfirst($c->status) . ' — Tk ' . number_format($c->total_amount, 2),
                    'deleted_at' => $c->deleted_at?->format('Y-m-d H:i:s'),
                ])->values(),
                'invoices' => $invoices->map(fn (Invoice $i) => [
                    'id' => $i->id,
                    'name' => $i->invoice_number,
                    'sub' => $i->party->party_name ?? '-',
                    'meta' => ucfirst($i->status) . ' — Tk ' . number_format($i->total_amount, 2) . ' (Due: Tk ' . number_format($i->amount_due, 2) . ')',
                    'deleted_at' => $i->deleted_at?->format('Y-m-d H:i:s'),
                ])->values(),
                'payments' => $payments->map(fn (PaymentHistory $p) => [
                    'id' => $p->id,
                    'name' => $p->invoice->invoice_number ?? '-',
                    'sub' => $p->invoice?->party?->party_name ?? '-',
                    'meta' => 'Tk ' . number_format($p->amount, 2) . ' — ' . ucfirst($p->payment_method ?? '-'),
                    'deleted_at' => $p->deleted_at?->format('Y-m-d H:i:s'),
                ])->values(),
            ],
        ]);
    }

    public function restore(Request $request, string $model, int $id): RedirectResponse
    {
        $this->findTrashed($model, $id)->restore();

        return back();
    }

    public function destroy(Request $request, string $model, int $id): RedirectResponse
    {
        $record = $this->findTrashed($model, $id);
        $this->cleanup($record);
        $record->forceDelete();

        return back();
    }

    private function findTrashed(string $model, int $id)
    {
        return $this->modelClass($model)::withTrashed()->findOrFail($id);
    }

    private function modelClass(string $model): string
    {
        return match ($model) {
            'parties' => Party::class,
            'products' => Product::class,
            'challans' => Challan::class,
            'invoices' => Invoice::class,
            'payments' => PaymentHistory::class,
            default => abort(404, 'Unknown trash model'),
        };
    }

    private function cleanup($record): void
    {
        if ($record instanceof Challan) {
            $record->items()->delete();
            DB::table('invoice_challans')->where('challan_id', $record->id)->delete();
        }

        if ($record instanceof Invoice) {
            $record->items()->delete();
            $record->paymentHistory()->forceDelete();
            DB::table('invoice_challans')->where('invoice_id', $record->id)->delete();
        }

        if ($record instanceof Product) {
            $record->meals()->delete();
            if ($record->attachment_path) {
                Storage::disk('public')->delete($record->attachment_path);
            }
        }
    }
}
