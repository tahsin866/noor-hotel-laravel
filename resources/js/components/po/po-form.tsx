import { ClipboardList, Paperclip } from 'lucide-react';
import InputError from '@/components/input-error';
import PoMealFields from '@/components/po/po-meal-fields';
import type { Party } from '@/components/po/types';
import type { PoFormState } from '@/components/po/use-po-form';
import PartyCombobox from '@/components/shared/party-combobox';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const units = [
    'pcs',
    'kg',
    'g',
    'liter',
    'ml',
    'box',
    'pack',
    'dozen',
    'pair',
    'set',
    'roll',
    'meter',
];

const labelClass = 'text-xs font-medium text-muted-foreground';

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

type PoFormProps = {
    title: string;
    submitLabel: string;
    form: PoFormState;
    parties: Party[];
    processing: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

/**
 * Body of the create / edit purchase order dialog. Rendered inside DialogContent.
 */
export default function PoForm({
    title,
    submitLabel,
    form,
    parties,
    processing,
    onSubmit,
    onCancel,
}: PoFormProps) {
    const { errors, attachment, existingAttachmentUrl, attachmentInputRef } =
        form;

    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4.5 text-muted-foreground" />
                    {title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Fields marked with * are required.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>Name *</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => form.setName(e.target.value)}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>Party *</Label>
                        <PartyCombobox
                            parties={parties}
                            value={form.partyId}
                            onChange={form.setPartyId}
                            dropdownClassName="min-w-80"
                        />
                        <InputError message={errors.party_id} />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>Unit *</Label>
                        <Select value={form.unit} onValueChange={form.setUnit}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {units.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                        {unit}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.unit} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>VAT Rate %</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={form.vatRate}
                            onChange={(e) => form.setVatRate(e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>Customer PO No.</Label>
                        <Input
                            value={form.customerPoNumber}
                            onChange={(e) =>
                                form.setCustomerPoNumber(e.target.value)
                            }
                            placeholder="Optional"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className={labelClass}>Reminder</Label>
                        <Input
                            type="datetime-local"
                            value={form.reminderAt}
                            onChange={(e) => form.setReminderAt(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Admins are notified when this time is reached.
                        </p>
                        <InputError message={errors.reminder_at} />
                    </div>
                </div>
                <PoMealFields form={form} />
                <div className="grid gap-1.5">
                    <Label className={labelClass}>Description</Label>
                    <textarea
                        className={textareaClass}
                        rows={2}
                        placeholder="Optional notes about this order"
                        value={form.description}
                        onChange={(e) => form.setDescription(e.target.value)}
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className={labelClass}>Attachment</Label>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) =>
                                form.setAttachment(e.target.files?.[0] || null)
                            }
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => attachmentInputRef.current?.click()}
                        >
                            <Paperclip className="mr-1.5 size-3" />
                            {attachment ? attachment.name : 'Choose File'}
                        </Button>
                        {attachment && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs text-red-500 hover:text-red-600"
                                onClick={() => form.setAttachment(null)}
                            >
                                Remove
                            </Button>
                        )}
                        {!attachment && existingAttachmentUrl && (
                            <>
                                <a
                                    href={existingAttachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                                >
                                    <Paperclip className="size-3" />
                                    Current file
                                </a>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 text-xs text-red-500 hover:text-red-600"
                                    onClick={form.removeExistingAttachment}
                                >
                                    Remove
                                </Button>
                            </>
                        )}
                    </div>
                    <InputError message={errors.attachment} />
                    <p className="text-[10px] text-muted-foreground">
                        {existingAttachmentUrl
                            ? 'Choose a new file to replace the current one.'
                            : 'PDF, JPG, PNG, DOC up to 10MB'}
                    </p>
                </div>
            </div>
            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    disabled={processing}
                    onClick={onSubmit}
                    className="min-w-28"
                >
                    {processing ? 'Saving…' : submitLabel}
                </Button>
            </DialogFooter>
        </>
    );
}
