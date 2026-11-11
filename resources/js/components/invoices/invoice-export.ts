import * as XLSX from 'xlsx';
import { invoiceStatusLabel } from '@/components/invoices/invoice-status';
import type { Invoice } from '@/components/invoices/types';
import { formatDate } from '@/lib/format';

/**
 * Download the given invoices (the current page) as invoices.xlsx.
 */
export function exportInvoicesToExcel(invoices: Invoice[]): void {
    const rows = invoices.map((invoice) => ({
        'Invoice No': invoice.invoice_number,
        Party: invoice.party_name || '',
        'Customer PO': invoice.customer_po_number || '',
        Date: formatDate(invoice.date),
        'System PO': (invoice.system_pos || []).map((p) => p.code).join(', '),
        'Due Date': formatDate(invoice.due_date),
        Amount: invoice.total_amount || 0,
        Paid: invoice.amount_paid || 0,
        Due: invoice.amount_due || 0,
        Status: invoiceStatusLabel(invoice.status),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Invoices');
    XLSX.writeFile(workbook, 'invoices.xlsx');
}
