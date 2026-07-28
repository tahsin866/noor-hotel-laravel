<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        table.info td { border: none; padding: 4px 0; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #000; }
        .totals { text-align: right; font-size: 14px; margin-top: 12px; }
        .totals div { margin-bottom: 4px; }
        .totals .grand { font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
        .totals .in-words { text-align: left; margin-top: 8px; font-size: 12px; color: #475569; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding: 8px 15mm; }
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

    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Invoice to:</strong><br/><br/>
                {{ $party_name }}<br/><br/>
                @if($party_address)
                    {{ $party_address }}<br/>
                @endif
            </td>
            <td style="width:40%; text-align:right;">
                <div style="display:inline-block; text-align:left; margin-top:4px;">
                    <strong>Invoice Date:</strong> {{ \Carbon\Carbon::parse($invoice->date)->format('d/m/Y') }}<br/><br/>
                    <strong>Ref:</strong> {{ $invoice->invoice_number }}<br/><br/>
                    <strong>Customer PO:</strong> {{ $customer_po_number }}
                </div>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th style="width:40px;">SL</th>
                <th>Product / Item</th>
                <th style="width:70px;text-align:left;">Meal</th>
                <th style="width:70px;text-align:center;">Qty</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:100px;text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item['description'] }}</td>
                <td style="text-align:left;">{{ $item['meal_type'] ?? '—' }}</td>
                <td style="text-align:center;">{{ $item['quantity'] }}</td>
                <td style="text-align:right;">Tk {{ fmtPrice($item['unit_price']) }}</td>
                <td style="text-align:right;font-weight:bold;">Tk {{ fmtPrice($item['total']) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table style="border:none;font-size:14px;margin-left:auto;">
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;">Subtotal:</td>
                <td style="border:none;padding:4px 0;text-align:right;white-space:nowrap;"><strong>Tk {{ fmtPrice($invoice->subtotal) }}</strong></td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;">VAT:</td>
                <td style="border:none;padding:4px 0;text-align:right;white-space:nowrap;"><strong>Tk {{ fmtPrice($invoice->total_vat) }}</strong></td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;border-top:2px solid #e2e8f0;">Grand Total:</td>
                <td style="border:none;padding:4px 0;text-align:right;border-top:2px solid #e2e8f0;white-space:nowrap;font-size:16px;"><strong>Tk {{ fmtPrice($invoice->total_amount) }}</strong></td>
            </tr>
        </table>
        <div class="in-words"><strong>In Words:</strong> {{ $total_in_words }}</div>
    </div>

    <div style="position:fixed;bottom:10mm;left:10mm;right:10mm;">
        <table style="width:100%;border:none;font-size:12px;">
            <tr>
                <td style="width:55%;border:none;vertical-align:top;">
                    <strong style="font-size:13px;">Payment Method</strong><br/>
                    <table style="border:none;font-size:12px;margin-top:4px;">
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Bank Name:</strong></td>
                            <td style="border:none;padding:1px 0;">BRAC BANK</td>
                        </tr>
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>A/C Name:</strong></td>
                            <td style="border:none;padding:1px 0;">NOOR HOTEL AND RESTAURANT</td>
                        </tr>
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Account Number:</strong></td>
                            <td style="border:none;padding:1px 0;">2078277570001</td>
                        </tr>
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Swift Code:</strong></td>
                            <td style="border:none;padding:1px 0;">BRAKBDDH</td>
                        </tr>
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Routing No:</strong></td>
                            <td style="border:none;padding:1px 0;">060220259</td>
                        </tr>
                        <tr>
                            <td style="border:none;padding:1px 8px 1px 0;">&nbsp;</td>
                            <td style="border:none;padding:1px 0;">Court Bazar Sub-Branch</td>
                        </tr>
                    </table>
                </td>
                <td style="width:45%;border:none;text-align:right;vertical-align:top;">
                    <div style="border-top:1px solid #1e293b;width:200px;display:inline-block;"></div>
                    <div style="display:inline-block; text-align:left; padding-top:6px;">
                        <div style="font-weight:bold;font-size:12px;">Mohammod</div>
                        <div style="font-size:11px;">Noor Hotel & Restaurant</div>
                        <div style="font-size:11px;">Marketing Manager</div>
                    </div>
                </td>
            </tr>
        </table>
        <div style="text-align:center;font-size:18px;font-weight:bold;margin-top:10px;">Thank you for your business!</div>
    </div>

    </body>
</html>
