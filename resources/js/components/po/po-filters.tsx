import { Search } from 'lucide-react';
import { poStatusFilters } from '@/components/po/po-status';
import type { Party } from '@/components/po/types';
import PartyCombobox from '@/components/shared/party-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PoFiltersProps = {
    parties: Party[];
    status: string;
    onStatusChange: (status: string) => void;
    search: string;
    onSearchChange: (search: string) => void;
    partyId: string;
    onPartyChange: (partyId: string) => void;
    onClear: () => void;
    total: number;
};

/**
 * Status tabs, search box and party filter above the purchase order list.
 */
export default function PoFilters({
    parties,
    status,
    onStatusChange,
    search,
    onSearchChange,
    partyId,
    onPartyChange,
    onClear,
    total,
}: PoFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {poStatusFilters.map((filter) => (
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
                    placeholder="Search by PO, name or customer PO..."
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
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onClear}
            >
                Clear
            </Button>
            <span className="ml-auto text-xs font-medium text-muted-foreground">
                {total} order{total === 1 ? '' : 's'} total
            </span>
        </div>
    );
}
