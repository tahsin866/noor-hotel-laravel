import { amountInWords } from '@/components/invoices/amount-in-words';
import type { Invoice, InvoiceItem } from '@/components/invoices/types';
import { openPrintWindow } from '@/lib/print';

/** Terms & conditions printed as a numbered list when `show_terms` is on. */
export const INVOICE_TERMS = [
    'The applicable Government VAT and Tax are included in the quoted price.',
    'Transportation costs are also included in the invoice value.',
];

export const INVOICE_TERMS_TEXT = INVOICE_TERMS.join(' ');

/**
 * Print layout (A4):
 *
 * Page margins are left to the print dialog (Margins: Default / Custom), so a
 * pre-printed letterhead can be skipped by giving it a larger top margin.
 * The browser does the page breaking. Each invoice is one table:
 *   - `thead` holds the invoice header + column headings, repeated on every page,
 *   - the bank details / signature footer is `position: fixed` in print, so it
 *     sits at the bottom of every page; an empty `tfoot` row of the same
 *     height (repeated per page) keeps the rows from running under it,
 *   - the totals sit in a last row that is never split across pages.
 */
const PRINT_STYLES = `
    @page { size: A4; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; background: #f1f5f9; }
    .invoice { background: #fff; break-after: page; page-break-after: always; }
    .invoice:last-child { break-after: auto; page-break-after: auto; }
    @media screen { .invoice { width: 210mm; margin: 12px auto; padding: 10mm 12mm; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }
    @media print { body { background: #fff; } .invoice { padding: 0 1px; } }
    .doc-title { text-align: center; padding-bottom: 12px; }
    .doc-title h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; }
    table.info td { border: none; padding: 4px 0; vertical-align: top; }
    table.items { width: 100%; table-layout: fixed; border-collapse: collapse; }
    table.items > thead { display: table-header-group; }
    table.items > tfoot { display: table-footer-group; }
    table.items > * > tr { break-inside: avoid; page-break-inside: avoid; }
    table.items > * > tr > th { padding: 6px 8px; border: 1px solid #000; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items > * > tr > td { padding: 4px 6px; border: 1px solid #000; font-size: 11px; vertical-align: top; }
    table.items > * > tr.frame > td { border: none; padding: 0; font-size: 13px; }
    .totals { padding-top: 12px; text-align: right; font-size: 14px; }
    .totals table { border: none; margin-left: auto; font-size: 14px; }
    .totals td { border: none; padding: 4px 0; text-align: right; white-space: nowrap; }
    .totals td.label { padding-right: 10px; }
    .totals .rule td { border-top: 2px solid #e2e8f0; }
    .note { text-align: left; margin-top: 8px; font-size: 12px; color: #475569; }
    .terms { text-align: left; margin-top: 10px; font-size: 11px; color: #475569; }
    .terms ol { margin: 4px 0 0; padding-left: 18px; }
    .terms li { margin-bottom: 2px; line-height: 1.4; }
    .footer-space { height: 0; }
    .print-footer { display: none; }
    @media print {
        .screen-footer { display: none; }
        .footer-space { height: 48mm; }
        .print-footer { display: block; position: fixed; left: 1px; right: 1px; bottom: 0; background: #fff; }
    }
    .sheet-footer { padding-top: 16px; font-size: 12px; }
    .sheet-footer table { width: 100%; border: none; border-collapse: collapse; }
    .sheet-footer td { border: none; vertical-align: top; }
    .bank td { padding: 1px 8px 1px 0; white-space: nowrap; }
    .generated { font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 8px; }`;

/** "Page x of y" in the bottom margin (single invoice only, so numbering is per invoice). */
const PAGE_NUMBER_STYLE = `
    @page { @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #94a3b8; } }`;

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
        ? `<div class="terms"><strong>Terms &amp; Conditions:</strong>
            <ol>${INVOICE_TERMS.map((term) => `<li>${term}</li>`).join('')}</ol>
        </div>`
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
 * One invoice as a single table so the browser repeats header and footer.
 */
function renderInvoice(invoice: Invoice, footer: string): string {
    return `<section class="invoice">
    <table class="items">
        <colgroup>
            <col style="width:26px;" />
            <col />
            <col style="width:80px;" />
            <col style="width:40px;" />
            <col style="width:72px;" />
            <col style="width:80px;" />
        </colgroup>
        <thead>
            <tr class="frame"><td colspan="6">${renderHeader(invoice)}</td></tr>
            <tr>
                <th style="text-align:center;">SL</th>
                <th>Product / Item</th>
                <th>Meal</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Amount</th>
            </tr>
        </thead>
        <tfoot>
            <tr class="frame"><td colspan="6"><div class="footer-space"></div></td></tr>
        </tfoot>
        <tbody>${renderItemRows(invoice.items || [])}</tbody>
        <tbody>
            <tr class="frame"><td colspan="6">${renderTotals(invoice)}</td></tr>
        </tbody>
    </table>
    <div class="screen-footer">${footer}</div>
</section>`;
}

/** Bank details and signature, pinned to the bottom of every printed page. */
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

    return `<div class="sheet-footer">
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
    <div class="generated">Generated by M/S Noor Hotel and Restaurant</div>
</div>`;
}

/**
 * Full printable HTML document for one or more invoices.
 */
export function renderInvoiceDocument(invoices: Invoice[]): string {
    const title =
        invoices.length === 1
            ? `Invoice ${invoices[0].invoice_number}`
            : 'Invoice Batch Print';
    const footer = renderFooter();

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>${PRINT_STYLES}${invoices.length === 1 ? PAGE_NUMBER_STYLE : ''}
    </style>
</head>
<body>
    <div class="print-footer">${footer}</div>
    ${invoices.map((invoice) => renderInvoice(invoice, footer)).join('')}
</body>
</html>`;
}

export function printInvoices(invoices: Invoice[]): void {
    openPrintWindow(renderInvoiceDocument(invoices));
}
