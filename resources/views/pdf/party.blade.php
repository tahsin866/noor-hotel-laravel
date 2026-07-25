<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Party - {{ $party->party_name }}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
        .header .underline { border-bottom: 3px solid #2563eb; width: 200px; margin: 6px auto 0; }
        .header .sub { color: #64748b; margin: 4px 0 0; font-size: 12px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        table.info td { padding: 8px 12px; border: 1px solid #e2e8f0; vertical-align: top; }
        table.info td.label { background: #f1f5f9; font-weight: 600; width: 30%; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-amber { background: #fef3c7; color: #b45309; }
        .badge-purple { background: #f3e8ff; color: #7c3aed; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding: 8px 15mm; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PARTY DETAILS</h1>
        <div class="underline"></div>
        <p class="sub">Noor Hotel PRG</p>
    </div>

    <table class="info">
        <tr>
            <td class="label">Party Name</td>
            <td>{{ $party->party_name }}</td>
            <td class="label">Party Type</td>
            <td>
                @php
                    $typeColors = ['supplier' => 'badge-blue', 'customer' => 'badge-green', 'both' => 'badge-amber', 'hotel' => 'badge-purple'];
                    $colorClass = $typeColors[$party->party_type] ?? 'badge-blue';
                @endphp
                <span class="badge {{ $colorClass }}">{{ ucfirst($party->party_type) }}</span>
            </td>
        </tr>
        <tr>
            <td class="label">Contact Person</td>
            <td>{{ $party->contact_person ?: '—' }}</td>
            <td class="label">Phone</td>
            <td>{{ $party->phone ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Email</td>
            <td colspan="3">{{ $party->email ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Address</td>
            <td colspan="3">{{ $party->address ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Agreement Type</td>
            <td>
                @php
                    $agrColors = ['annual' => 'badge-green', 'monthly' => 'badge-blue', 'quarterly' => 'badge-amber', 'custom' => 'badge-purple'];
                    $agrColor = $agrColors[$party->agreement_type] ?? 'badge-blue';
                @endphp
                <span class="badge {{ $agrColor }}">{{ ucfirst($party->agreement_type ?: '—') }}</span>
            </td>
            <td class="label">Period</td>
            <td>
                @if($party->start_date && $party->end_date)
                    {{ \Carbon\Carbon::parse($party->start_date)->format('d/m/Y') }} — {{ \Carbon\Carbon::parse($party->end_date)->format('d/m/Y') }}
                @else
                    —
                @endif
            </td>
        </tr>
        @if($party->notes)
        <tr>
            <td class="label">Notes</td>
            <td colspan="3">{{ $party->notes }}</td>
        </tr>
        @endif
    </table>

    <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:20px;">
        Generated on {{ now()->format('d/m/Y') }} &mdash; Noor Hotel PRG
    </div>
</body>
</html>
