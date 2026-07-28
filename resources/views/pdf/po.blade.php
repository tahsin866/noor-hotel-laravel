<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Purchase Order {{ $product->code }}</title>
    <style>
        @page { size: A4; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
        .header .underline { border-bottom: 3px solid #2563eb; width: 200px; margin: 6px auto 0; }
        .header .sub { color: #64748b; margin: 4px 0 0; font-size: 12px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        table.info td { border: none; padding: 4px 0; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #e2e8f0; }
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
        <h1>PURCHASE ORDER</h1>
        <div class="underline"></div>
        <p class="sub">Noor Hotel PRG</p>
    </div>

    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Party:</strong> {{ $party_name }}<br/>
                <strong>PO Code:</strong> {{ $product->code }}<br/>
                <strong>Customer PO:</strong> {{ $product->customer_po_number ?: 'N/A' }}
            </td>
            <td style="width:40%; text-align:right;">
                <strong>Date:</strong> {{ $date }}<br/>
                <strong>Unit:</strong> {{ $product->unit }}<br/>
                <strong>VAT Rate:</strong> {{ $product->vat_rate }}%
            </td>
        </tr>
    </table>

    @if($product->description)
    <div style="margin-bottom:16px;">
        <span style="color:#64748b;font-weight:600;">Description:</span>
        <p style="margin:4px 0">{{ $product->description }}</p>
    </div>
    @endif

    <table class="items">
        <thead>
            <tr>
                <th style="width:40px;">#</th>
                <th>Meal Type</th>
                <th style="width:80px;text-align:center;">Ordered</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:100px;text-align:right;">Amount</th>
                <th style="width:80px;text-align:center;">Delivered</th>
                <th style="width:80px;text-align:center;">Remaining</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item['meal_type'] }}</td>
                <td style="text-align:center;">{{ $item['quantity'] }}</td>
                <td style="text-align:right;">Tk {{ fmtPrice($item['unit_price']) }}</td>
                <td style="text-align:right;font-weight:bold;">Tk {{ fmtPrice($item['total']) }}</td>
                <td style="text-align:center;">{{ $item['delivered_quantity'] }}</td>
                <td style="text-align:center;">{{ $item['remaining'] }}</td>
                <td>{{ $item['description'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div>Subtotal: <strong>Tk {{ fmtPrice($subtotal) }}</strong></div>
        <div>VAT ({{ $product->vat_rate }}%): <strong>Tk {{ fmtPrice($vat) }}</strong></div>
        <div class="grand">Total (inc. VAT): <strong>Tk {{ fmtPrice($total) }}</strong></div>
    </div>

    <div style="position:fixed;bottom:15mm;left:15mm;right:15mm;">
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
                    <div style="padding-top:6px;font-weight:bold;font-size:12px;">Approved By</div>
                </td>
            </tr>
        </table>
        <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:8px 0;">
            Generated on {{ $date }} &mdash; Noor Hotel PRG
        </div>
    </div>
</body>
</html>
