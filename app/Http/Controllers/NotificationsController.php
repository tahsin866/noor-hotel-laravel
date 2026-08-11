<?php

namespace App\Http\Controllers;

use App\Notifications\NewEmailImport;
use App\Notifications\PurchaseOrderReminder;
use App\Notifications\RecordCreated;
use Illuminate\Http\RedirectResponse;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationsController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 30, 50, 100], true) ? $perPage : 20;

        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return Inertia::render('noor-hotel/notifications', [
            'notifications' => [
                'data' => $notifications->getCollection()->map(fn (DatabaseNotification $n) => [
                    'id' => $n->id,
                    'title' => $this->titleFor($n),
                    'body' => $this->bodyFor($n),
                    'read_at' => $n->read_at?->format('Y-m-d H:i:s'),
                    'created_at' => $n->created_at?->format('Y-m-d H:i:s'),
                ]),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                    'last_page' => $notifications->lastPage(),
                ],
            ],
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function read(Request $request, string $id): RedirectResponse
    {
        $request->user()->notifications()->where('id', $id)->first()?->markAsRead();

        return back();
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }

    public function destroy(Request $request, string $id): RedirectResponse
    {
        $request->user()->notifications()->where('id', $id)->delete();

        return back();
    }

    private function titleFor(DatabaseNotification $notification): string
    {
        return match ($notification->type) {
            NewEmailImport::class => 'New Email Import',
            PurchaseOrderReminder::class => 'PO Reminder',
            RecordCreated::class => match ($notification->data['entity'] ?? null) {
                'party' => 'New Party',
                'purchase_order' => 'New Purchase Order',
                'challan' => 'New Challan',
                'invoice' => 'New Invoice',
                'payment' => 'New Payment',
                default => 'New Record',
            },
            default => 'New Notification',
        };
    }

    private function bodyFor(DatabaseNotification $notification): string
    {
        $data = $notification->data;

        return match ($notification->type) {
            NewEmailImport::class => implode(' · ', array_filter([
                $data['supplier_name'] ?? null,
                $data['po_number'] ?? null,
                $data['subject'] ?? null,
                isset($data['total_amount']) ? 'Amount: '.$data['total_amount'].' '.($data['currency'] ?? '') : null,
            ])),
            PurchaseOrderReminder::class => implode(' · ', array_filter([
                $data['code'] ?? null,
                $data['name'] ?? null,
                $data['party'] ?? null,
            ])),
            RecordCreated::class => match ($data['entity'] ?? null) {
                'party' => $data['party_name'] ?? '',
                'purchase_order' => implode(' · ', array_filter([
                    $data['code'] ?? null,
                    $data['party'] ?? null,
                    isset($data['amount']) ? 'Amount: '.$data['amount'] : null,
                ])),
                'challan' => implode(' · ', array_filter([
                    $data['challan_number'] ?? null,
                    isset($data['po_number']) ? 'PO: '.$data['po_number'] : null,
                    isset($data['amount']) ? 'Amount: '.$data['amount'] : null,
                ])),
                'invoice' => implode(' · ', array_filter([
                    $data['invoice_number'] ?? null,
                    $data['party'] ?? null,
                    isset($data['amount']) ? 'Amount: '.$data['amount'] : null,
                ])),
                'payment' => implode(' · ', array_filter([
                    $data['invoice_number'] ?? null,
                    $data['party'] ?? null,
                    isset($data['amount']) ? 'Amount: '.$data['amount'] : null,
                ])),
                default => collect($data)->map(fn ($value, $key) => ucfirst($key).': '.$value)->implode(' · '),
            },
            default => collect($data)->map(fn ($value, $key) => ucfirst($key).': '.$value)->implode(' · '),
        };
    }
}
