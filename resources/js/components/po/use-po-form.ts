import { useRef, useState } from 'react';
import { toDatetimeLocal } from '@/components/po/po-reminder';
import type { MealRow, Product } from '@/components/po/types';

/**
 * State and helpers for the create / edit purchase order form.
 */
export function usePoForm() {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('pcs');
    const [vatRate, setVatRate] = useState('');
    const [partyId, setPartyId] = useState('');
    const [customerPoNumber, setCustomerPoNumber] = useState('');
    const [description, setDescription] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [meals, setMeals] = useState<MealRow[]>([]);
    const [attachment, setAttachmentState] = useState<File | null>(null);
    const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<
        string | null
    >(null);
    const [attachmentRemoved, setAttachmentRemoved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const clearAttachmentInput = () => {
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = '';
        }
    };

    const reset = () => {
        setName('');
        setUnit('pcs');
        setVatRate('');
        setPartyId('');
        setCustomerPoNumber('');
        setDescription('');
        setReminderAt('');
        setMeals([]);
        setAttachmentState(null);
        setExistingAttachmentUrl(null);
        setAttachmentRemoved(false);
        clearAttachmentInput();
        setErrors({});
    };

    const fillFromProduct = (product: Product) => {
        setName(product.name);
        setUnit(product.unit);
        setVatRate(String(product.vat_rate));
        setPartyId(product.party_id ? String(product.party_id) : '');
        setCustomerPoNumber(product.customer_po_number || '');
        setDescription(product.description || '');
        setReminderAt(toDatetimeLocal(product.reminder_at));
        setMeals(
            (product.meals ?? []).map((meal) => ({
                id: meal.id,
                meal_type: meal.meal_type,
                quantity: meal.quantity,
                unit_price: meal.unit_price,
                description: meal.description || '',
            })),
        );
        setAttachmentState(null);
        setExistingAttachmentUrl(product.attachment_url || null);
        setAttachmentRemoved(false);
        clearAttachmentInput();
        setErrors({});
    };

    const addMeal = () =>
        setMeals((prev) => [
            ...prev,
            { meal_type: '', quantity: 0, unit_price: 0, description: '' },
        ]);

    const removeMeal = (index: number) =>
        setMeals((prev) => prev.filter((_, i) => i !== index));

    const updateMeal = <K extends keyof MealRow>(
        index: number,
        field: K,
        value: MealRow[K],
    ) =>
        setMeals((prev) =>
            prev.map((meal, i) =>
                i === index ? { ...meal, [field]: value } : meal,
            ),
        );

    /** Pick a new file, or clear the newly picked one with `null`. */
    const setAttachment = (file: File | null) => {
        setAttachmentState(file);

        if (!file) {
            clearAttachmentInput();
        }
    };

    /** Drop the file already saved on the PO. */
    const removeExistingAttachment = () => {
        setAttachmentRemoved(true);
        setExistingAttachmentUrl(null);
    };

    const toFormData = (): FormData => {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('unit', unit);
        fd.append('vat_rate', String(parseFloat(vatRate || '0')));

        if (partyId) {
            fd.append('party_id', partyId);
        }

        if (customerPoNumber) {
            fd.append('customer_po_number', customerPoNumber);
        }

        if (description) {
            fd.append('description', description);
        }

        if (reminderAt) {
            fd.append('reminder_at', new Date(reminderAt).toISOString());
        }

        if (attachment) {
            fd.append('attachment', attachment);
        } else if (attachmentRemoved) {
            fd.append('attachment_remove', '1');
        }

        meals
            .filter(
                (meal) =>
                    meal.quantity > 0 ||
                    meal.unit_price > 0 ||
                    meal.description,
            )
            .forEach((meal, i) => {
                if (meal.id) {
                    fd.append(`meals[${i}][id]`, String(meal.id));
                }

                fd.append(`meals[${i}][meal_type]`, meal.meal_type);
                fd.append(`meals[${i}][quantity]`, String(meal.quantity));
                fd.append(`meals[${i}][unit_price]`, String(meal.unit_price));

                if (meal.description) {
                    fd.append(`meals[${i}][description]`, meal.description);
                }
            });

        return fd;
    };

    return {
        name,
        setName,
        unit,
        setUnit,
        vatRate,
        setVatRate,
        partyId,
        setPartyId,
        customerPoNumber,
        setCustomerPoNumber,
        description,
        setDescription,
        reminderAt,
        setReminderAt,
        meals,
        addMeal,
        removeMeal,
        updateMeal,
        attachment,
        setAttachment,
        existingAttachmentUrl,
        removeExistingAttachment,
        attachmentInputRef,
        errors,
        setErrors,
        reset,
        fillFromProduct,
        toFormData,
    };
}

export type PoFormState = ReturnType<typeof usePoForm>;
