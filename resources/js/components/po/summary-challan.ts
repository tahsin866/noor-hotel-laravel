import { formatDate } from '@/lib/format';
import { formatMealType } from '@/lib/meals';
import { openPrintWindow } from '@/lib/print';

export type SummaryChallanItem = {
    product_meal_id: number | null;
    description: string;
    meal_type: string;
    quantity: number;
};

export type SummaryChallanSource = {
    id: number;
    challan_number: string;
    date: string | null;
    notes: string | null;
    items: SummaryChallanItem[];
};

/** Response of GET /api/products/{id}/summary-challan */
export type SummaryChallanData = {
    ref: string;
    client: string;
    product_name: string;
    po_number: string;
    customer_po_number: string | null;
    delivery_date: string;
    notes: string;
    challans: SummaryChallanSource[];
};

export type SummaryChallanOptions = {
    /** How many challans go into one summary (0 = all in one). */
    challansPerSummary: number;
    /** Show the delivery period and the print date. */
    showDates: boolean;
    /** List the challan numbers (and dates) included in each summary. */
    listChallans: boolean;
};

export type SummaryGroup = {
    ref: string;
    challans: SummaryChallanSource[];
    items: SummaryChallanItem[];
    totalQuantity: number;
    from: string | null;
    to: string | null;
};

/** "Noor/2026/CH/0650" + 2 → "Noor/2026/CH/0652" (keeps zero padding). */
function offsetRef(ref: string, offset: number): string {
    const match = /^(.*?)(\d+)$/.exec(ref);

    if (!match || offset === 0) {
        return ref;
    }

    const [, prefix, digits] = match;

    return (
        prefix +
        String(parseInt(digits, 10) + offset).padStart(digits.length, '0')
    );
}

/** Add up quantities per PO meal line across the given challans. */
function aggregateItems(
    challans: SummaryChallanSource[],
): SummaryChallanItem[] {
    const lines = new Map<string, SummaryChallanItem>();

    for (const challan of challans) {
        for (const item of challan.items) {
            const key =
                item.product_meal_id !== null
                    ? `meal:${item.product_meal_id}`
                    : `text:${item.description}|${item.meal_type}`;
            const line = lines.get(key);

            if (line) {
                line.quantity += item.quantity;
            } else {
                lines.set(key, { ...item });
            }
        }
    }

    return Array.from(lines.values()).filter((line) => line.quantity > 0);
}

/**
 * Split the PO's challans (oldest first) into summary groups of
 * `challansPerSummary` each, with totals per meal line.
 */
export function buildSummaryGroups(
    data: SummaryChallanData,
    challansPerSummary: number,
): SummaryGroup[] {
    const size =
        challansPerSummary > 0 ? challansPerSummary : data.challans.length || 1;
    const groups: SummaryGroup[] = [];

    for (let start = 0; start < data.challans.length; start += size) {
        const challans = data.challans.slice(start, start + size);
        const items = aggregateItems(challans);
        const dates = challans
            .map((challan) => challan.date)
            .filter((date): date is string => Boolean(date))
            .sort();

        groups.push({
            ref: offsetRef(data.ref, groups.length),
            challans,
            items,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            from: dates[0] ?? null,
            to: dates[dates.length - 1] ?? null,
        });
    }

    return groups;
}

const BLANK =
    '<span style="display:inline-block;width:90px;border-bottom:1px solid #1e293b;">&nbsp;</span>';

const PRINT_STYLES = `
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
    .summary { page-break-after: always; break-after: page; }
    .summary:last-child { page-break-after: auto; break-after: auto; }
    h1 { font-size: 24px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
    .underline { border-bottom: 3px solid #2563eb; width: 200px; margin: 6px auto 0; }
    .sub { color: #64748b; margin: 4px 0 0; font-size: 12px; text-align: center; }
    table.info { width: 100%; border-collapse: collapse; margin: 18px 0 14px; font-size: 13px; }
    table.info td { border: none; padding: 3px 0; vertical-align: top; }
    .label { color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.items th { background: #f1f5f9; padding: 7px 10px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items td { padding: 7px 10px; border: 1px solid #000; }
    table.items tr { page-break-inside: avoid; break-inside: avoid; }
    table.items tfoot td { font-weight: bold; background: #f8fafc; }
    .challan-list { margin-bottom: 14px; font-size: 10.5px; color: #475569; }
    .challan-list .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 12px; margin-top: 4px; }
    .signatures { margin-top: 36px; page-break-inside: avoid; break-inside: avoid; }
    .footer { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 30px; }`;

function renderSummary(
    data: SummaryChallanData,
    group: SummaryGroup,
    index: number,
    count: number,
    options: SummaryChallanOptions,
): string {
    const period =
        group.from && group.to
            ? group.from === group.to
                ? formatDate(group.from)
                : `${formatDate(group.from)} – ${formatDate(group.to)}`
            : '—';

    const rows = group.items
        .map(
            (item, i) => `<tr>
                <td style="width:36px;text-align:center;">${i + 1}</td>
                <td>${item.description}</td>
                <td style="width:120px;">${item.meal_type ? formatMealType(item.meal_type) : '—'}</td>
                <td style="width:90px;text-align:center;">${item.quantity}</td>
            </tr>`,
        )
        .join('');

    const challanList = options.listChallans
        ? `<div class="challan-list"><strong>Included challans (${group.challans.length}):</strong>
            <div class="grid">${group.challans
                .map(
                    (challan) =>
                        `<span>${challan.challan_number}${options.showDates && challan.date ? ` — ${formatDate(challan.date)}` : ''}</span>`,
                )
                .join('')}</div></div>`
        : '';

    const customerPo =
        data.customer_po_number && data.customer_po_number !== '-'
            ? `<strong>Customer PO:</strong> ${data.customer_po_number}<br/>`
            : '';

    return `<div class="summary">
    <div style="text-align:center;margin-bottom:16px;">
        <h1>DELIVERY CHALLAN</h1>
        <div class="underline"></div>
        <p class="sub">Noor Hotel PRG — Summary${count > 1 ? ` ${index + 1} of ${count}` : ''}</p>
    </div>
    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Deliver to:</strong> ${data.client}<br/>
                <strong>PO:</strong> ${data.po_number || '—'}<br/>
                ${customerPo}
                <strong>Challans:</strong> ${group.challans.length}
            </td>
            <td style="width:40%;text-align:right;">
                <strong>Ref:</strong> ${group.ref}<br/>
                <strong>Delivery Date:</strong> ${options.showDates ? data.delivery_date : BLANK}<br/>
                ${options.showDates ? `<strong>Delivery Period:</strong> ${period}` : ''}
            </td>
        </tr>
    </table>
    <div class="label">Items Delivered:</div>
    <table class="items">
        <thead>
            <tr>
                <th style="text-align:center;">SL</th>
                <th>Description</th>
                <th>Meal</th>
                <th style="text-align:center;">Total Qty</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr>
                <td colspan="3" style="text-align:right;">Total</td>
                <td style="text-align:center;">${group.totalQuantity}</td>
            </tr>
        </tfoot>
    </table>
    ${challanList}
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
        <span>${options.showDates ? `Print Date: ${new Date().toLocaleDateString('en-GB')}` : ''}</span>
        <span>Generated by M/S Noor Hotel and Restaurant</span>
    </div>
</div>`;
}

export function renderSummaryChallanDocument(
    data: SummaryChallanData,
    options: SummaryChallanOptions,
): string {
    const groups = buildSummaryGroups(data, options.challansPerSummary);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Summary Challan ${data.po_number}</title>
    <style>${PRINT_STYLES}
    </style>
</head>
<body>
    ${groups.map((group, i) => renderSummary(data, group, i, groups.length, options)).join('')}
</body>
</html>`;
}

export function printSummaryChallans(
    data: SummaryChallanData,
    options: SummaryChallanOptions,
): void {
    openPrintWindow(renderSummaryChallanDocument(data, options));
}
