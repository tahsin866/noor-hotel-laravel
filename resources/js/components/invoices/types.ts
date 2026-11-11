export type Party = {
    id: number;
    party_name: string;
    requirements?: string[] | null;
};

export type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    party_id: number;
    customer_po_number: string;
    party?: Party;
};

export type ChallanMealItem = {
    id?: number;
    meal_type: string;
    quantity: number;
    description?: string;
};

/** An uninvoiced challan that can be attached to an invoice. */
export type SelectableChallan = {
    id: number;
    challan_number: string;
    product_id: number;
    product_name: string;
    po_number: string;
    party_id: number;
    party_name: string;
    date: string;
    status: string;
    items?: ChallanMealItem[];
};

export type InvoiceItem = {
    id: number;
    product_name: string;
    description?: string;
    meal_type?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
};

export type InvoiceChallan = {
    id: number;
    challan_number: string;
    product_id?: number | null;
    product_name: string;
    po_number: string;
    party_id?: number | null;
    party_name: string;
    challan_date: string;
    challan_status: string;
    items?: ChallanMealItem[];
};

export type Invoice = {
    id: number;
    invoice_number: string;
    party_id: number;
    party_name: string;
    party_address?: string;
    date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    system_pos?: { id: number; code: string }[];
    status: string;
    print_status: string;
    show_print_date?: boolean;
    show_terms?: boolean;
    subtotal?: number;
    total_vat?: number;
    customer_po_number?: string;
    notes?: string;
    items?: InvoiceItem[];
    challans?: InvoiceChallan[];
};
