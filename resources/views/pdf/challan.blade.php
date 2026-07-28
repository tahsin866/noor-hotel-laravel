<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Challan {{ $challan->challan_number }}</title>
    <style>
        @page { size: A4; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        .header { text-align: center; padding-bottom: 12px; margin-bottom: 16px; }
        h1 { font-size: 22px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #000; }
        .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; word-wrap: break-word; overflow-wrap: break-word; }
        .content-wrapper { position: relative; min-height: 760px; }
        .footer { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .signatures { position: absolute; bottom: 30px; left: 0; right: 0; }
        @media print {
            body { margin: 0; padding: 0; }
            .content-wrapper { min-height: auto; }
        }
    </style>
</head>
<body>
    @php
    function fmtPrice($val) {
        return fmod($val, 1) == 0 ? number_format($val, 0) : number_format($val, 2);
    }
    @endphp

    <div class="content-wrapper">
        <div class="header">
            <h1>DELIVERY CHALLAN</h1>
        </div>

        <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
            <tr>
                <td style="width:50%;border:none;padding:4px 0;"><strong>Challan No:</strong> {{ $challan->challan_number }}</td>
                <td style="width:50%;border:none;padding:4px 0;text-align:right;"><strong>Date:</strong> {{ \Carbon\Carbon::parse($challan->date)->format('d/m/Y') }}</td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 0;"><strong>PO:</strong> {{ $customer_po_number }}</td>
                <td style="border:none;padding:4px 0;text-align:right;"><strong>Product:</strong> {{ $product_name }}</td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 0;"><strong>Party:</strong> {{ $party_name }}</td>
            </tr>
            @if($challan->address)
            <tr>
                <td colspan="2" style="border:none;padding:4px 0;width:100%;"><span style="word-wrap:anywhere;"><strong>Address:</strong> {{ $challan->address }}</span></td>
            </tr>
            @endif
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:40px;">SL</th>
                    <th>Product / Item</th>
                    <th style="width:80px;text-align:left;">Meal</th>
                    <th style="width:80px;text-align:center;">Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $i => $item)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $item['description'] }}</td>
                    <td style="text-align:left;">{{ ucfirst($item['meal_type']) }}</td>
                    <td style="text-align:center;">{{ $item['quantity'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        @if($challan->notes)
        <div class="notes">
            <strong>Notes:</strong> {{ $challan->notes }}
        </div>
        @endif

        <div class="signatures">
            <table style="width:100%;border:none;">
                <tr>
                    <td style="width:45%;border:none;text-align:center;padding:0;">
                        <div style="height:40px;"></div>
                        <div style="border-top:1px solid #1e293b;"></div>
                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Received By</div>
                    </td>
                    <td style="width:10%;border:none;"></td>
                    <td style="width:45%;border:none;text-align:center;padding:0;">
                        <div style="height:40px;"></div>
                        <div style="border-top:1px solid #1e293b;"></div>
                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Prepared By</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer">
            Generated on {{ now()->format('d/m/Y') }} &mdash; Noor Hotel PRG
        </div>
    </div>
</body>
</html>
