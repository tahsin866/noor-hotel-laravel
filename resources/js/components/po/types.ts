export type { ChallanFormItem } from '@/components/challans/types';

export type Party = { id: number; party_name: string };

export type ProductMeal = {
    id: number;
    meal_type: string;
    quantity: number;
    unit_price: number;
    delivered_quantity: number;
    remaining: number;
    over_delivered: number;
    description: string;
};

export type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    vat_rate: number;
    unit_price: number;
    party_id: number;
    party_name: string;
    customer_po_number: string;
    description: string;
    attachment_path?: string | null;
    attachment_url?: string | null;
    reminder_at?: string | null;
    reminder_notified_at?: string | null;
    meals: ProductMeal[];
    total_ordered: number;
    total_delivered: number;
    total_remaining?: number | null;
    total_over_delivered?: number | null;
    meals_subtotal?: number;
    challans_count?: number;
    invoiced_challans_count?: number;
    invoices?: { id: number; invoice_number: string }[];
};

/** One editable order line in the PO form. */
export type MealRow = {
    id?: number;
    meal_type: string;
    quantity: number;
    unit_price: number;
    description: string;
};
