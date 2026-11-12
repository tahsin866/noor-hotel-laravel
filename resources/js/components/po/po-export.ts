import * as XLSX from 'xlsx';
import { getDeliveryStatus } from '@/components/po/po-status';
import type { Product } from '@/components/po/types';

/**
 * Download the given purchase orders (the current page) as purchase_orders.xlsx.
 */
export function exportPurchaseOrdersToExcel(products: Product[]): void {
    const rows = products.map((product) => {
        const meals = product.meals || [];

        return {
            Code: product.code,
            Name: product.name,
            Party: product.party_name || '',
            'Customer PO': product.customer_po_number || '',
            Unit: product.unit,
            'VAT Rate': `${product.vat_rate}%`,
            Ordered: meals.reduce((sum, meal) => sum + meal.quantity, 0),
            Delivered: meals.reduce(
                (sum, meal) => sum + (meal.delivered_quantity || 0),
                0,
            ),
            Status: getDeliveryStatus(product).label,
        };
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'PurchaseOrders');
    XLSX.writeFile(workbook, 'purchase_orders.xlsx');
}

/**
 * Open the mail client with a pre-filled message about the PO.
 */
export function emailPurchaseOrder(product: Product): void {
    const subject = encodeURIComponent(
        `Purchase Order - ${product.code} (${product.name})`,
    );
    const body = encodeURIComponent(
        `Please find attached Purchase Order ${product.code} for ${product.name}.\n\nParty: ${product.party_name || 'N/A'}\nCustomer PO: ${product.customer_po_number || 'N/A'}\n\nThank you.`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
}
