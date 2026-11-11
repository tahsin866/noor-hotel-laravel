export type Party = { id: number; party_name: string };

export type ProductMeal = {
    id: number;
    meal_type: string;
    quantity: number;
    unit_price: number;
    delivered_quantity: number;
    allocated_quantity?: number | string;
    description?: string;
};

export type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    party_id: number;
    party?: Party;
    party_name: string;
    customer_po_number: string;
    meals: ProductMeal[];
    total_ordered: number;
    total_delivered: number;
};

export type ChallanItem = {
    product_meal_id: number;
    quantity: number;
    unit_price: number;
    product_name: string;
    meal_type: string;
    description?: string;
};

export type ChallanStatus =
    'pending' | 'dispatched' | 'delivered' | 'cancelled';

export type Challan = {
    id: number;
    challan_number: string;
    product_id: number;
    product_name: string;
    po_number: string;
    customer_po_number: string;
    party_name: string;
    date: string;
    address: string;
    notes: string;
    total_amount: number;
    total_qty: number;
    status: string;
    show_print_date?: boolean;
    items: ChallanItem[];
};

export type ChallanFormItem = {
    product_meal_id: number;
    meal_type: string;
    unit_price: number;
    quantity: number;
    max: number;
    description?: string;
};
