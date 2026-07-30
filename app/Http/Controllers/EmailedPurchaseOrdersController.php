<?php

namespace App\Http\Controllers;

use App\Models\EmailedPurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailedPurchaseOrdersController extends Controller
{
    public function __invoke(Request $request)
    {
        $type = $request->query('type');
        $status = $request->query('status');

        $query = EmailedPurchaseOrder::latest('email_date');

        if (in_array($type, ['purchase_order', 'deadline', 'general'])) {
            $query->where('type', $type);
        }

        if (in_array($status, ['new', 'read', 'archived'])) {
            $query->where('status', $status);
        }

        $emails = $query->get()->map(fn ($email) => [
            'id' => $email->id,
            'message_id' => $email->message_id,
            'from_email' => $email->from_email,
            'from_name' => $email->from_name,
            'subject' => $email->subject,
            'email_date' => $email->email_date?->toIso8601String(),
            'type' => $email->type,
            'status' => $email->status,
            'po_number' => $email->po_number,
            'po_date' => $email->po_date?->toIso8601String(),
            'deadline' => $email->deadline?->toIso8601String(),
            'supplier_name' => $email->supplier_name,
            'total_amount' => $email->total_amount,
            'currency' => $email->currency,
            'notes' => $email->notes,
            'imported_at' => $email->imported_at?->toIso8601String(),
        ]);

        return Inertia::render('noor-hotel/emails', [
            'emails' => $emails,
            'filters' => [
                'type' => $type,
                'status' => $status,
            ],
        ]);
    }
}
