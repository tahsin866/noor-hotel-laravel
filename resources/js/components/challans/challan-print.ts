import type { Challan, ChallanItem } from '@/components/challans/types';
import { formatDate } from '@/lib/format';
import { formatMealType } from '@/lib/meals';
import { openPrintWindow } from '@/lib/print';

const PRINT_STYLES = `
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 22px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #000; }
        .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 20px; }
        .signatures { margin-top: 30px; }
        .content-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
        .body-content { flex: 1 0 auto; }
        .bottom-block { margin-top: auto; }
        .challan-page { page-break-after: always; }
        .challan-page:last-child { page-break-after: avoid; }`;

const BLANK_DATE =
    '<span style="display:inline-block;width:90px;border-bottom:1px solid #1e293b;">&nbsp;</span>';

function renderItemRows(items: ChallanItem[]): string {
    return items
        .filter((item) => item.quantity > 0)
        .map(
            (item, index) => `<tr>
                <td style="width:20px;padding:6px 8px;border:1px solid #000;text-align:center;">${index + 1}</td>
                <td style="padding:6px 12px;border:1px solid #000;">${item.description || item.product_name}</td>
                <td style="width:90px;padding:6px 8px;border:1px solid #000;text-align:left;white-space:normal;word-break:break-word;overflow-wrap:break-word;">${formatMealType(item.meal_type)}</td>
                <td style="width:50px;padding:6px 8px;border:1px solid #000;text-align:center;">${item.quantity}</td>
            </tr>`,
        )
        .join('');
}

function renderSignature(label: string): string {
    return `<td style="width:45%;border:none;text-align:center;padding:0;">
                <div style="height:40px;"></div>
                <div style="border-top:1px solid #1e293b;"></div>
                <div style="padding-top:6px;font-weight:bold;font-size:12px;">${label}</div>
            </td>`;
}

/**
 * HTML for one printed delivery challan page.
 */
export function renderChallanPage(challan: Challan): string {
    const hasCustomerPo =
        challan.customer_po_number && challan.customer_po_number !== '-';
    const poCell = hasCustomerPo
        ? `<strong>Customer PO:</strong> ${challan.customer_po_number}`
        : `<strong>PO:</strong> ${challan.po_number || '—'}`;
    const dateCell =
        challan.show_print_date !== false
            ? formatDate(challan.date)
            : BLANK_DATE;

    return `<div class="challan-page">
    <div class="content-wrapper">
        <div class="body-content">
            <h1>DELIVERY CHALLAN</h1>
            <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
                <tr>
                    <td style="border:none;padding:4px 0;"><strong>Party:</strong> ${challan.party_name || '—'}</td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Challan No:</strong> ${challan.challan_number}</td>
                </tr>
                <tr>
                    <td style="border:none;padding:4px 0;max-width:50%;overflow-wrap:break-word;word-wrap:break-word;"><strong>Address:</strong> ${challan.address || '—'}</td>
                    <td style="border:none;padding:4px 0;text-align:right;">${poCell}</td>
                </tr>
                <tr>
                    <td style="border:none;padding:4px 0;"></td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Date:</strong> ${dateCell}</td>
                </tr>
            </table>
            <table class="items">
                <thead>
                    <tr>
                        <th style="width:20px;">SL</th>
                        <th>Product / Item</th>
                        <th style="width:90px;text-align:left;">Meal</th>
                        <th style="width:50px;text-align:center;">Qty</th>
                    </tr>
                </thead>
                <tbody>${renderItemRows(challan.items || [])}</tbody>
            </table>
            ${challan.notes ? `<div class="notes"><strong>Notes:</strong> ${challan.notes}</div>` : ''}
        </div>
        <div class="bottom-block">
            <div class="signatures">
                <table style="width:100%;border:none;">
                    <tr>
                        ${renderSignature('Received By')}
                        <td style="width:10%;border:none;"></td>
                        ${renderSignature('Prepared By')}
                    </tr>
                </table>
            </div>
            <div class="footer">Generated by M/S Noor Hotel and Restaurant</div>
        </div>
    </div>
</div>`;
}

/**
 * Print one or more challans, each on its own page.
 */
export function printChallans(challans: Challan[]): void {
    const title =
        challans.length === 1
            ? `Challan ${challans[0].challan_number}`
            : 'Challans Batch Print';

    openPrintWindow(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>${PRINT_STYLES}
    </style>
</head>
<body>
    ${challans.map(renderChallanPage).join('')}
</body>
</html>`);
}
