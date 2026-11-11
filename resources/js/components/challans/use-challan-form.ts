import { useState } from 'react';
import type {
    Challan,
    ChallanFormItem,
    ChallanItem,
    Product,
} from '@/components/challans/types';

/**
 * Units still to deliver on a PO (ordered minus delivered, per meal).
 */
export function remainingOf(product: Product): number {
    return (product.meals || []).reduce(
        (sum, meal) =>
            sum + Math.max(0, meal.quantity - (meal.delivered_quantity || 0)),
        0,
    );
}

/**
 * Build dispatchable rows for a PO. When editing, the challan's own
 * quantities are added back so they do not count against the PO.
 */
function buildItems(
    product: Product,
    existingItems: ChallanItem[] = [],
): ChallanFormItem[] {
    return (product.meals || []).flatMap((meal) => {
        const existing = existingItems.find(
            (item) => item.product_meal_id === meal.id,
        );
        const existingQty = existing ? Number(existing.quantity) : 0;
        const remaining = Math.max(
            0,
            meal.quantity -
                (Number(meal.allocated_quantity || 0) - existingQty),
        );

        if (remaining <= 0) {
            return [];
        }

        return [
            {
                product_meal_id: meal.id,
                meal_type: meal.meal_type,
                unit_price: meal.unit_price,
                quantity: existing ? existing.quantity : remaining,
                max: remaining,
                description: meal.description,
            },
        ];
    });
}

/**
 * State and helpers for the create / edit challan form.
 */
export function useChallanForm(products: Product[]) {
    const [partyId, setPartyIdState] = useState('');
    const [productId, setProductId] = useState('');
    const [poInfo, setPoInfo] = useState<Product | null>(null);
    const [items, setItems] = useState<ChallanFormItem[]>([]);
    const [date, setDate] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [showPrintDate, setShowPrintDate] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectPo = (id: string, existingItems: ChallanItem[] = []) => {
        setProductId(id);
        const product = products.find((p) => p.id === parseInt(id));
        setPoInfo(product ?? null);
        setItems(product ? buildItems(product, existingItems) : []);
    };

    const setPartyId = (id: string) => {
        setPartyIdState(id);
        setProductId('');
        setPoInfo(null);
        setItems([]);
    };

    const updateItemQty = (index: number, quantity: number) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, quantity: Math.min(quantity, item.max) }
                    : item,
            ),
        );
    };

    const reset = () => {
        setPartyIdState('');
        setProductId('');
        setPoInfo(null);
        setItems([]);
        setDate('');
        setAddress('');
        setNotes('');
        setShowPrintDate(true);
        setErrors({});
    };

    const fillFromChallan = (challan: Challan) => {
        const product = products.find((p) => p.id === challan.product_id);
        setPartyIdState(product?.party_id ? String(product.party_id) : '');
        setDate(challan.date);
        setAddress(challan.address || '');
        setNotes(challan.notes || '');
        setShowPrintDate(challan.show_print_date !== false);
        selectPo(String(challan.product_id), challan.items || []);
        setErrors({});
    };

    const availableProducts = (
        partyId
            ? products.filter((p) => String(p.party_id) === partyId)
            : products
    ).filter((p) => remainingOf(p) > 0);

    const grandTotal = items.reduce(
        (sum, item) =>
            sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0,
    );

    const toPayload = () => ({
        product_id: parseInt(productId),
        date,
        address,
        notes,
        show_print_date: showPrintDate,
        items: items.map((item) => ({
            product_meal_id: item.product_meal_id,
            quantity: item.quantity,
        })),
    });

    return {
        partyId,
        setPartyId,
        productId,
        selectPo,
        poInfo,
        items,
        updateItemQty,
        date,
        setDate,
        address,
        setAddress,
        notes,
        setNotes,
        showPrintDate,
        setShowPrintDate,
        errors,
        setErrors,
        availableProducts,
        grandTotal,
        reset,
        fillFromChallan,
        toPayload,
    };
}

export type ChallanFormState = ReturnType<typeof useChallanForm>;
