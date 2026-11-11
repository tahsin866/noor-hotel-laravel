import { invoiceStatusFilters } from '@/components/invoices/invoice-status';
import type { Party } from '@/components/invoices/types';
import type { InvoiceListFilters } from '@/components/invoices/use-invoice-list';
import PartyCombobox from '@/components/shared/party-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InvoiceFiltersProps = {
    parties: Party[];
    filters: InvoiceListFilters;
    onChange: <K extends keyof InvoiceListFilters>(
        key: K,
        value: InvoiceListFilters[K],
    ) => void;
    onClear: () => void;
    total: number;
};

const fieldLabelClass =
    'text-[10px] font-semibold text-muted-foreground uppercase';

/**
 * Party / date / search filters plus the status tabs above the invoice list.
 */
export default function InvoiceFilters({
    parties,
    filters,
    onChange,
    onClear,
    total,
}: InvoiceFiltersProps) {
    return (
        <>
            <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>Party</Label>
                    <div className="w-56">
                        <PartyCombobox
                            parties={parties}
                            value={filters.partyId}
                            onChange={(value) => onChange('partyId', value)}
                            allowAll
                            size="sm"
                        />
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>From</Label>
                    <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => onChange('dateFrom', e.target.value)}
                        className="h-8 w-36 text-xs"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>To</Label>
                    <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => onChange('dateTo', e.target.value)}
                        className="h-8 w-36 text-xs"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>Search</Label>
                    <Input
                        placeholder="Invoice no, PO, party..."
                        value={filters.search}
                        onChange={(e) => onChange('search', e.target.value)}
                        className="h-8 w-48 text-xs"
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={onClear}
                >
                    Clear
                </Button>
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {total} invoice{total === 1 ? '' : 's'} total
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {invoiceStatusFilters.map((status) => (
                    <button
                        key={status.value}
                        onClick={() => onChange('status', status.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            filters.status === status.value
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        {status.label}
                    </button>
                ))}
            </div>
        </>
    );
}
