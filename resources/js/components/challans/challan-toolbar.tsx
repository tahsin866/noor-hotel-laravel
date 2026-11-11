import { Printer, Search, Send, Trash2 } from 'lucide-react';
import { challanStatusFilters } from '@/components/challans/challan-status';
import type { ChallanStatus, Party } from '@/components/challans/types';
import PartyCombobox from '@/components/shared/party-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ChallanFiltersProps = {
    parties: Party[];
    status: string;
    onStatusChange: (status: string) => void;
    search: string;
    onSearchChange: (search: string) => void;
    partyId: string;
    onPartyChange: (partyId: string) => void;
    total: number;
};

/**
 * Status tabs, search box and party filter above the challan list.
 */
export function ChallanFilters({
    parties,
    status,
    onStatusChange,
    search,
    onSearchChange,
    partyId,
    onPartyChange,
    total,
}: ChallanFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {challanStatusFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => onStatusChange(filter.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${status === filter.value ? 'border border-border bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by challan # or PO..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-8 w-56 pl-8 text-xs"
                />
            </div>
            <div className="w-56">
                <PartyCombobox
                    parties={parties}
                    value={partyId}
                    onChange={onPartyChange}
                    allowAll
                    size="sm"
                    dropdownClassName="min-w-80"
                />
            </div>
            <span className="ml-auto text-xs font-medium text-muted-foreground">
                {total} challan{total === 1 ? '' : 's'} total
            </span>
        </div>
    );
}

type ChallanBulkBarProps = {
    count: number;
    onPrint: () => void;
    onStatusChange: (status: ChallanStatus) => void;
    onClear: () => void;
};

/**
 * Actions for the challans ticked in the table.
 */
export function ChallanBulkBar({
    count,
    onPrint,
    onStatusChange,
    onClear,
}: ChallanBulkBarProps) {
    if (count === 0) {
        return null;
    }

    const actionClass = 'h-7 text-xs';

    return (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <span className="text-xs font-medium text-primary">
                {count} selected
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={actionClass}
                    onClick={onPrint}
                >
                    <Printer className="mr-1 size-3" />
                    Print
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={actionClass}
                    onClick={() => onStatusChange('dispatched')}
                >
                    <Send className="mr-1 size-3" />
                    Dispatch
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={actionClass}
                    onClick={() => onStatusChange('delivered')}
                >
                    <Send className="mr-1 size-3" />
                    Deliver
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={actionClass}
                    onClick={() => onStatusChange('cancelled')}
                >
                    <Trash2 className="mr-1 size-3" />
                    Cancel
                </Button>
            </div>
            <button
                onClick={onClear}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
                Clear
            </button>
        </div>
    );
}
