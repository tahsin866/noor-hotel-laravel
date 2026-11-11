import { amountInWords } from '@/components/invoices/amount-in-words';
import type { Invoice, InvoiceItem } from '@/components/invoices/types';
import { openPrintWindow } from '@/lib/print';

export const INVOICE_TERMS_TEXT =
    'Please note that the applicable Government VAT and Tax are included in the quoted price, and transportation costs are also included in the invoice value.';

/**
 * Print layout (A4):
 *
 * We do NOT rely on the browser's own page breaking (fixed footers and
 * repeated table headers behave differently between print dialogs). Instead
 * every printed page is a fixed-size `.sheet` (one A4 page) with:
 *   - the invoice header + column headings at the top,
 *   - the bank details / signature footer pinned to the bottom,
 *   - "Page x of y".
 * A small script in the print window measures the real row heights and moves
 * rows to a new sheet when the current one is full, so every page is laid out
 * the same way. The totals block is never split; if it does not fit after the
 * last row, it goes to the next sheet together with the footer.
 */
const PRINT_STYLES = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; background: #f1f5f9; }
    .sheet { width: 210mm; height: 296mm; padding: 10mm 12mm 8mm; margin: 0 auto; background: #fff; display: flex; flex-direction: column; overflow: hidden; page-break-after: always; break-after: page; }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .sheet-content { flex: 1 1 auto; min-height: 0; overflow: hidden; }
    .sheet-footer { flex: none; padding-top: 6px; font-size: 12px; }
    @media screen { .sheet { margin: 12px auto; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }
    @media print { body { background: #fff; } }
    .doc-title { text-align: center; padding-bottom: 12px; }
    .doc-title h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; }
    table.info td { border: none; padding: 4px 0; vertical-align: top; }
    table.items { width: 100%; table-layout: fixed; border-collapse: collapse; }
    table.items th { padding: 6px 8px; border: 1px solid #000; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items td { padding: 4px 6px; border: 1px solid #000; font-size: 11px; vertical-align: top; }
    .continued { text-align: right; font-size: 10px; color: #64748b; padding-top: 4px; }
    .totals { padding-top: 12px; text-align: right; font-size: 14px; }
    .totals table { border: none; margin-left: auto; font-size: 14px; }
    .totals td { border: none; padding: 4px 0; text-align: right; white-space: nowrap; }
    .totals td.label { padding-right: 10px; }
    .totals .rule td { border-top: 2px solid #e2e8f0; }
    .note { text-align: left; margin-top: 8px; font-size: 12px; color: #475569; }
    .note.terms { font-size: 11px; }
    .sheet-footer table { width: 100%; border: none; border-collapse: collapse; }
    .sheet-footer td { border: none; vertical-align: top; }
    .bank td { padding: 1px 8px 1px 0; white-space: nowrap; }
    .generated { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 8px; }`;

/**
 * Runs inside the print window: builds the `.sheet` pages from each
 * `<template class="invoice-src">` by measuring real heights.
 */
const PAGINATE_SCRIPT = `
(function () {
    var footerHtml = document.getElementById('footer-src').innerHTML;
    var output = document.getElementById('sheets');

    document.querySelectorAll('template.invoice-src').forEach(function (src) {
        var frag = src.content;
        var headerHtml = frag.querySelector('.src-header').innerHTML;
        var tableHead = frag.querySelector('table.src-table').cloneNode(true);
        tableHead.querySelector('tbody').innerHTML = '';
        var rows = Array.prototype.slice.call(frag.querySelectorAll('table.src-table tbody tr'));
        var totalsHtml = frag.querySelector('.src-totals').innerHTML;
        var sheets = [];
        var current;

        function newSheet() {
            var sheet = document.createElement('section');
            sheet.className = 'sheet';
            sheet.innerHTML =
                '<div class="sheet-content">' + headerHtml +
                '<div class="table-slot"></div><div class="continued"></div><div class="tail"></div></div>' +
                '<div class="sheet-footer">' + footerHtml + '</div>';
            var table = tableHead.cloneNode(true);
            table.className = 'items';
            sheet.querySelector('.table-slot').appendChild(table);
            output.appendChild(sheet);
            sheets.push(sheet);
            current = {
                sheet: sheet,
                content: sheet.querySelector('.sheet-content'),
                table: table,
                tbody: table.querySelector('tbody'),
                tail: sheet.querySelector('.tail'),
            };
        }

        function overflows() {
            return current.content.scrollHeight > current.content.clientHeight + 1;
        }

        newSheet();

        rows.forEach(function (row) {
            var node = document.importNode(row, true);
            current.tbody.appendChild(node);

            if (overflows() && current.tbody.rows.length > 1) {
                current.tbody.removeChild(node);
                current.sheet.querySelector('.continued').textContent = 'Continued on next page…';
                newSheet();
                current.tbody.appendChild(node);
            }
        });

        current.tail.innerHTML = totalsHtml;

        if (overflows() && current.tbody.rows.length > 0) {
            // Totals do not fit: carry the last few rows over with them so
            // the last page never holds the totals alone.
            current.tail.innerHTML = '';
            var carried = [];
            var carryCount = Math.min(3, current.tbody.rows.length - 1);

            for (var i = 0; i < carryCount; i++) {
                carried.unshift(current.tbody.removeChild(current.tbody.lastElementChild));
            }

            current.sheet.querySelector('.continued').textContent = 'Continued on next page…';
            newSheet();
            carried.forEach(function (node) { current.tbody.appendChild(node); });

            if (carried.length === 0) {
                current.table.style.display = 'none';
            }

            current.tail.innerHTML = totalsHtml;
        }

        sheets.forEach(function (sheet, index) {
            sheet.querySelector('.page-no').textContent =
                'Page ' + (index + 1) + ' of ' + sheets.length;
        });
    });

    document.body.setAttribute('data-paginated', '1');
})();`;

const BLANK_DATE =
    '<span style="display:inline-block;width:90px;border-bottom:1px solid #1e293b;">&nbsp;</span>';

/** Price as shown on the printed invoice (no decimals for whole numbers). */
export function formatPrintPrice(value: number | string): string {
    const amount = parseFloat(String(value || 0));

    return Number.isInteger(amount)
        ? amount.toLocaleString('en-US')
        : amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          });
}

function renderItemRows(items: InvoiceItem[]): string {
    return items
        .filter((item) => item.quantity > 0)
        .map(
            (item, index) => `<tr>
                <td style="text-align:center;">${index + 1}</td>
                <td style="white-space:pre-line;">${item.description || item.product_name}</td>
                <td style="word-break:break-word;overflow-wrap:break-word;">${item.meal_type || '-'}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">Tk ${formatPrintPrice(item.unit_price)}</td>
                <td style="text-align:right;font-weight:bold;">Tk ${formatPrintPrice(item.quantity * item.unit_price)}</td>
            </tr>`,
        )
        .join('');
}

function renderTotals(invoice: Invoice): string {
    const total = `Tk ${formatPrintPrice(invoice.total_amount)}`;
    const rows =
        (invoice.total_vat ?? 0) > 0
            ? `<tr><td class="label">Subtotal:</td><td><strong>Tk ${formatPrintPrice(invoice.subtotal || 0)}</strong></td></tr>
               <tr><td class="label">VAT:</td><td><strong>Tk ${formatPrintPrice(invoice.total_vat || 0)}</strong></td></tr>
               <tr class="rule"><td class="label">Grand Total:</td><td style="font-size:16px;"><strong>${total}</strong></td></tr>`
            : `<tr><td class="label">Total Amount:</td><td style="font-size:16px;"><strong>${total}</strong></td></tr>`;
    const terms = invoice.show_terms
        ? `<div class="note terms"><strong>Terms &amp; Conditions:</strong> ${INVOICE_TERMS_TEXT}</div>`
        : '';

    return `<div class="totals">
        <table>${rows}</table>
        <div class="note"><strong>In Words:</strong> ${amountInWords(invoice.total_amount || 0)}</div>
        ${terms}
    </div>`;
}

function renderHeader(invoice: Invoice): string {
    const date = invoice.date
        ? new Date(invoice.date).toLocaleDateString('en-GB')
        : '—';
    const customerPo = invoice.customer_po_number
        ? `<strong>Customer PO:</strong> ${invoice.customer_po_number}<br/>`
        : '';

    return `<div class="doc-title"><h1>INVOICE</h1></div>
        <table class="info">
            <tr>
                <td style="width:60%;word-break:break-word;">
                    <strong>Invoice to:</strong><br/>
                    ${invoice.party_name || 'N/A'}<br/>
                    ${invoice.party_address ? invoice.party_address + '<br/>' : ''}
                </td>
                <td style="width:40%;text-align:right;">
                    <div style="display:inline-block;text-align:left;margin-top:4px;">
                        <strong>Invoice Date:</strong> ${invoice.show_print_date !== false ? date : BLANK_DATE}<br/>
                        <strong>Ref:</strong> ${invoice.invoice_number}<br/>
                        ${customerPo}
                    </div>
                </td>
            </tr>
        </table>`;
}

/**
 * Source data for one invoice. The pagination script turns it into sheets.
 */
function renderInvoiceSource(invoice: Invoice): string {
    return `<template class="invoice-src">
    <div class="src-header">${renderHeader(invoice)}</div>
    <table class="src-table">
        <colgroup>
            <col style="width:26px;" />
            <col />
            <col style="width:80px;" />
            <col style="width:40px;" />
            <col style="width:72px;" />
            <col style="width:80px;" />
        </colgroup>
        <thead>
            <tr>
                <th style="text-align:center;">SL</th>
                <th>Product / Item</th>
                <th>Meal</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Amount</th>
            </tr>
        </thead>
        <tbody>${renderItemRows(invoice.items || [])}</tbody>
    </table>
    <div class="src-totals">${renderTotals(invoice)}</div>
</template>`;
}

/** Bank details and signature, repeated at the bottom of every sheet. */
function renderFooter(): string {
    const bankRows = [
        ['Bank Name:', 'BRAC BANK'],
        ['A/C Name:', 'NOOR HOTEL AND RESTAURANT'],
        ['Account Number:', '2078277570001'],
        ['Swift Code:', 'BRAKBDDH'],
        ['Routing No:', '060220259'],
        ['&nbsp;', 'Court Bazar Sub-Branch'],
    ]
        .map(
            ([label, value]) =>
                `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`,
        )
        .join('');

    return `<template id="footer-src">
    <table>
        <tr>
            <td style="width:55%;">
                <strong style="font-size:13px;">Payment Method</strong>
                <table class="bank" style="width:auto;margin-top:4px;">${bankRows}</table>
            </td>
            <td style="width:45%;text-align:center;">
                <div style="height:28px;"></div>
                <div style="border-top:1px solid #1e293b;width:200px;display:inline-block;"></div>
                <div style="padding-top:6px;">
                    <div style="font-weight:bold;font-size:12px;">Mohammod</div>
                    <div style="font-size:11px;">Noor Hotel &amp; Restaurant</div>
                    <div style="font-size:11px;">Marketing Manager</div>
                </div>
            </td>
        </tr>
    </table>
    <div class="generated"><span>Generated by M/S Noor Hotel and Restaurant</span><span class="page-no"></span></div>
</template>`;
}

/**
 * Full printable HTML document for one or more invoices.
 */
export function renderInvoiceDocument(invoices: Invoice[]): string {
    const title =
        invoices.length === 1
            ? `Invoice ${invoices[0].invoice_number}`
            : 'Invoice Batch Print';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>${PRINT_STYLES}
    </style>
</head>
<body>
    ${renderFooter()}
    ${invoices.map(renderInvoiceSource).join('')}
    <div id="sheets"></div>
    <script>${PAGINATE_SCRIPT}</script>
</body>
</html>`;
}

export function printInvoices(invoices: Invoice[]): void {
    openPrintWindow(renderInvoiceDocument(invoices));
}
