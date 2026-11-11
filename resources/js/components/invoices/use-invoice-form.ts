import { useState } from 'react';
import type {
    Invoice,
    InvoiceChallan,
    Party,
    Product,
    SelectableChallan,
} from '@/components/invoices/types';

const today = () => new Date().toISOString().slice(0, 10);

function toSelectableChallan(challan: InvoiceChallan): SelectableChallan {
    return {
        id: challan.id,
        challan_number: challan.challan_number,
        product_id: challan.product_id ?? 0,
        product_name: challan.product_name,
        po_number: challan.po_number,
        party_id: challan.party_id ?? 0,
        party_name: challan.party_name,
        date: challan.challan_date,
        status: challan.challan_status,
        items: challan.items,
    };
}

/**
 * State and helpers for the create / edit invoice form.
 *
 * `challans` are the uninvoiced challans from the page props. When editing,
 * the invoice's own challans are merged in so they can stay selected.
 */
export function useInvoiceForm({
    parties,
    products,
    challans,
}: {
    parties: Party[];
    products: Product[];
    challans: SelectableChallan[];
}) {
    const [partyId, setPartyIdState] = useState('');
    const [productId, setProductIdState] = useState('');
    const [date, setDate] = useState(today);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [challanIds, setChallanIds] = useState<number[]>([]);
    const [availableChallans, setAvailableChallans] =
        useState<SelectableChallan[]>(challans);
    const [challanSearch, setChallanSearch] = useState('');
    const [showPrintDate, setShowPrintDate] = useState(true);
    const [showTerms, setShowTerms] = useState(false);

    const setPartyId = (id: string) => {
        setPartyIdState(id);
        setProductIdState('');
        setChallanIds([]);
    };

    const setProductId = (id: string) => {
        setProductIdState(id);
        setChallanIds([]);
    };

    const partyRequirements =
        parties.find((p) => String(p.id) === partyId)?.requirements ?? [];

    /** POs of the selected party that still have invoiceable challans. */
    const partyProducts = partyId
        ? products.filter(
              (product) =>
                  String(product.party_id) === partyId &&
                  challans.some(
                      (c) =>
                          c.product_id === product.id &&
                          (c.status === 'pending' || c.status === 'delivered'),
                  ),
          )
        : [];

    const visibleChallans = availableChallans.filter((challan) => {
        if (!partyId || String(challan.party_id) !== partyId) {
            return false;
        }

        if (productId && String(challan.product_id) !== productId) {
            return false;
        }

        const term = challanSearch.toLowerCase();

        return (
            !term ||
            `${challan.challan_number} ${challan.product_name} ${challan.po_number}`
                .toLowerCase()
                .includes(term)
        );
    });

    const allVisibleSelected =
        visibleChallans.length > 0 &&
        visibleChallans.every((c) => challanIds.includes(c.id));

    const toggleChallan = (id: number) =>
        setChallanIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );

    const toggleAllVisible = () =>
        setChallanIds((prev) =>
            allVisibleSelected
                ? prev.filter((id) => !visibleChallans.some((c) => c.id === id))
                : [
                      ...prev,
                      ...visibleChallans
                          .filter((c) => !prev.includes(c.id))
                          .map((c) => c.id),
                  ],
        );

    const reset = () => {
        setPartyIdState('');
        setProductIdState('');
        setDate(today());
        setDueDate('');
        setNotes('');
        setChallanIds([]);
        setAvailableChallans(challans);
        setChallanSearch('');
        setShowPrintDate(true);
        setShowTerms(false);
    };

    const fillFromInvoice = (invoice: Invoice) => {
        setPartyIdState(String(invoice.party_id ?? ''));
        setProductIdState('');
        setDate(invoice.date ? String(invoice.date).slice(0, 10) : '');
        setDueDate(
            invoice.due_date ? String(invoice.due_date).slice(0, 10) : '',
        );
        setNotes(invoice.notes || '');
        setShowPrintDate(invoice.show_print_date !== false);
        setShowTerms(invoice.show_terms === true);
        setChallanIds((invoice.challans || []).map((c) => c.id));
        setAvailableChallans((prev) => {
            const byId = new Map(prev.map((c) => [c.id, c]));

            for (const challan of invoice.challans || []) {
                if (challan.id) {
                    byId.set(challan.id, toSelectableChallan(challan));
                }
            }

            return Array.from(byId.values());
        });
        setChallanSearch('');
    };

    const isComplete = Boolean(
        partyId && challanIds.length > 0 && date && dueDate,
    );

    const toPayload = () => ({
        party_id: parseInt(partyId),
        date,
        due_date: dueDate,
        notes,
        challan_ids: challanIds,
        show_print_date: showPrintDate,
        show_terms: showTerms,
    });

    return {
        partyId,
        setPartyId,
        partyRequirements,
        productId,
        setProductId,
        partyProducts,
        date,
        setDate,
        dueDate,
        setDueDate,
        notes,
        setNotes,
        challanIds,
        challanSearch,
        setChallanSearch,
        visibleChallans,
        allVisibleSelected,
        toggleChallan,
        toggleAllVisible,
        showPrintDate,
        setShowPrintDate,
        showTerms,
        setShowTerms,
        isComplete,
        reset,
        fillFromInvoice,
        toPayload,
    };
}

export type InvoiceFormState = ReturnType<typeof useInvoiceForm>;
