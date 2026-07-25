<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 22px; margin: 0; color: #0f172a; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #e2e8f0; }
        .totals { text-align: right; font-size: 14px; margin-top: 12px; }
        .totals div { margin-bottom: 4px; }
        .totals .grand { font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
        .totals .paid { color: #16a34a; }
        .totals .due { color: #dc2626; }
        .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    </style>
</head>
<body>
    @php
    function fmtPrice($val) {
        return fmod($val, 1) == 0 ? number_format($val, 0) : number_format($val, 2);
    }
    @endphp

    <div class="header">
        <h1>INVOICE</h1>
    </div>

    <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
        <tr>
            <td style="width:50%;border:none;padding:4px 0;"><strong>Invoice No:</strong> {{ $invoice->invoice_number }}</td>
            <td style="width:50%;border:none;padding:4px 0;"><strong>Date:</strong> {{ \Carbon\Carbon::parse($invoice->date)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td style="border:none;padding:4px 0;"><strong>Party:</strong> {{ $party_name }}</td>
            <td style="border:none;padding:4px 0;"><strong>Due Date:</strong> {{ \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td style="border:none;padding:4px 0;"><strong>Status:</strong> {{ ucfirst($invoice->status) }}</td>
            <td style="border:none;padding:4px 0;"></td>
        </tr>
    </table>

    @if(count($challans) > 0)
    <p style="font-size:12px;color:#475569;margin:0 0 8px 0;font-weight:600;">Challans</p>
    <table class="items" style="margin-bottom:20px;">
        <thead>
            <tr>
                <th style="width:40px;">#</th>
                <th>Challan No</th>
                <th>Product</th>
                <th>Date</th>
                <th style="width:100px;text-align:center;">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($challans as $i => $ch)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td style="font-weight:600;">{{ $ch['challan_number'] }}</td>
                <td>{{ $ch['product_name'] }}</td>
                <td>{{ $ch['date'] }}</td>
                <td style="text-align:center;">
                    <span style="padding:2px 8px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1d4ed8;">{{ $ch['status'] }}</span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <table class="items">
        <thead>
            <tr>
                <th style="width:40px;">#</th>
                <th>Product / Item</th>
                <th style="width:70px;text-align:center;">Qty</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:90px;text-align:right;">VAT</th>
                <th style="width:100px;text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item['description'] }}</td>
                <td style="text-align:center;">{{ $item['quantity'] }}</td>
                <td style="text-align:right;">Tk {{ fmtPrice($item['unit_price']) }}</td>
                <td style="text-align:right;">{{ $item['vat_rate'] }}% (Tk {{ fmtPrice($item['vat_amount']) }})</td>
                <td style="text-align:right;font-weight:bold;">Tk {{ fmtPrice($item['total']) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div>Subtotal: <strong>Tk {{ fmtPrice($invoice->subtotal) }}</strong></div>
        <div>VAT: <strong>Tk {{ fmtPrice($invoice->total_vat) }}</strong></div>
        <div class="grand">Total: <strong>Tk {{ fmtPrice($invoice->total_amount) }}</strong></div>
        <div class="paid">Paid: <strong>Tk {{ fmtPrice($invoice->amount_paid) }}</strong></div>
        <div class="due">Due: <strong>Tk {{ fmtPrice($invoice->amount_due) }}</strong></div>
    </div>

    @if($invoice->notes)
    <div class="notes">
        <strong>Notes:</strong> {{ $invoice->notes }}
    </div>
    @endif

    <div class="footer">
        Generated on {{ now()->format('d/m/Y') }} &mdash; Noor Hotel PRG
    </div>

    <div style="margin-top:60px;">
        <table style="width:100%;border:none;">
            <tr>
                <td style="width:45%;border:none;text-align:center;padding:0;">
                    <div style="height:40px;"></div>
                    <div style="border-top:1px solid #1e293b;"></div>
                    <div style="padding-top:6px;font-weight:bold;font-size:12px;">Prepared By</div>
                </td>
                <td style="width:10%;border:none;"></td>
                <td style="width:45%;border:none;text-align:center;padding:0;">
                    <div style="height:40px;"></div>
                    <div style="border-top:1px solid #1e293b;"></div>
                    <div style="padding-top:6px;font-weight:bold;font-size:12px;">Received By</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
