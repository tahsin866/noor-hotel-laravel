import type { Product, ProductMeal } from '@/components/po/types';
import { openPrintWindow } from '@/lib/print';

const cell = 'padding:8px 12px;border:1px solid #e2e8f0;';

function itemRow(meal: ProductMeal, index: number): string {
    const lineTotal = meal.quantity * meal.unit_price;
    const remaining = meal.remaining ?? 0;
    const overDelivered = meal.over_delivered ?? 0;

    return `<tr>
        <td style="${cell}">${index + 1}</td>
        <td style="${cell}text-transform:capitalize;">${meal.meal_type}</td>
        <td style="${cell}text-align:center;">${meal.quantity}</td>
        <td style="${cell}text-align:right;">Tk ${Number(meal.unit_price).toFixed(2)}</td>
        <td style="${cell}text-align:right;font-weight:bold;">Tk ${lineTotal.toFixed(2)}</td>
        <td style="${cell}text-align:center;">${meal.delivered_quantity || 0}</td>
        <td style="${cell}text-align:center;">${overDelivered > 0 ? `-${overDelivered}` : remaining}</td>
        <td style="${cell}">${meal.description || '-'}</td>
    </tr>`;
}

function remainingLabel(meals: ProductMeal[]): string {
    const net = meals.reduce(
        (sum, meal) => sum + (meal.remaining ?? 0) - (meal.over_delivered ?? 0),
        0,
    );

    if (net > 0) {
        return `Remaining: <strong>${net}</strong>`;
    }

    if (net < 0) {
        return `Over-delivered: <strong>${Math.abs(net)}</strong>`;
    }

    return 'Fully delivered';
}

function signatureCell(label: string): string {
    return `<td style="width:45%;border:none;text-align:center;padding:0;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #1e293b;"></div>
        <div style="padding-top:6px;font-weight:bold;font-size:12px;">${label}</div>
    </td>`;
}

/**
 * Build the printable purchase order document.
 */
export function buildPoHtml(product: Product): string {
    const meals = product.meals || [];
    const subtotal = meals.reduce(
        (sum, meal) => sum + meal.quantity * meal.unit_price,
        0,
    );
    const vatRate = product.vat_rate || 0;
    const vat = (subtotal * vatRate) / 100;
    const total = subtotal + vat;
    const today = new Date().toLocaleDateString('en-GB');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Purchase Order ${product.code}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
        .underline { border-bottom: 3px solid #2563eb; width: 200px; margin: 6px auto 0; }
        .sub { color: #64748b; margin: 4px 0 0; font-size: 12px; text-align: center; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        table.info td { border: none; padding: 4px 0; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #e2e8f0; }
        .totals { text-align: right; font-size: 14px; margin-top: 12px; }
        .totals div { margin-bottom: 4px; }
        .totals .grand { font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
    </style>
</head>
<body>
    <div style="text-align:center;margin-bottom:20px;">
        <h1>PURCHASE ORDER</h1>
        <div class="underline"></div>
        <p class="sub">Noor Hotel PRG</p>
    </div>
    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Party:</strong> ${product.party_name || '-'}<br/>
                <strong>PO Code:</strong> ${product.code}<br/>
                <strong>Customer PO:</strong> ${product.customer_po_number || 'N/A'}
            </td>
            <td style="width:40%;text-align:right;">
                <strong>Date:</strong> ${today}<br/>
                <strong>Unit:</strong> ${product.unit}<br/>
                <strong>VAT Rate:</strong> ${vatRate}%
            </td>
        </tr>
    </table>
    ${product.description ? `<div style="margin-bottom:16px;"><span style="color:#64748b;font-weight:600;">Description:</span><p style="margin:4px 0">${product.description}</p></div>` : ''}
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
        <tbody>${meals.map(itemRow).join('')}</tbody>
    </table>
    <div class="totals">
        <div>${remainingLabel(meals)}</div>
        <div>Subtotal: <strong>Tk ${subtotal.toFixed(2)}</strong></div>
        <div>VAT (${vatRate}%): <strong>Tk ${vat.toFixed(2)}</strong></div>
        <div class="grand">Total (inc. VAT): <strong>Tk ${total.toFixed(2)}</strong></div>
    </div>
    <div style="position:fixed;bottom:15mm;left:15mm;right:15mm;">
        <table style="width:100%;border:none;">
            <tr>
                ${signatureCell('Prepared By')}
                <td style="width:10%;border:none;"></td>
                ${signatureCell('Approved By')}
            </tr>
        </table>
        <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:8px 0;">
            Generated on ${today} &mdash; Noor Hotel PRG
        </div>
    </div>
</body>
</html>`;
}

export function printPurchaseOrder(product: Product): void {
    openPrintWindow(buildPoHtml(product));
}
