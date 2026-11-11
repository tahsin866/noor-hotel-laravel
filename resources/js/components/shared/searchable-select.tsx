import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
    value: string;
    label: string;
    description?: ReactNode;
    /** Extra text matched by the search box besides the label. */
    keywords?: string;
};

type SearchableSelectProps = {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    /** Shown on the trigger when nothing (or the "all" option) is selected. */
    placeholder: string;
    searchPlaceholder?: string;
    emptyText?: string;
    /** Adds a first option with value '' using this label (e.g. "All Parties"). */
    allOptionLabel?: string;
    size?: 'sm' | 'default';
    className?: string;
    dropdownClassName?: string;
};

/**
 * A dropdown button with a search box, used for party / PO pickers and filters.
 */
export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder = 'Search...',
    emptyText = 'No results found',
    allOptionLabel,
    size = 'default',
    className,
    dropdownClassName,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const isSmall = size === 'sm';
    const term = search.toLowerCase();
    const filteredOptions = options.filter((option) =>
        `${option.label} ${option.keywords ?? ''}`.toLowerCase().includes(term),
    );
    const selectedLabel =
        options.find((option) => option.value === value)?.label ?? placeholder;

    const close = () => {
        setOpen(false);
        setSearch('');
    };

    const select = (nextValue: string) => {
        onChange(nextValue);
        close();
    };

    const optionClass = (optionValue: string) =>
        cn(
            'w-full overflow-hidden rounded-sm px-3 py-2 text-left text-sm text-ellipsis whitespace-nowrap transition-colors hover:bg-accent',
            value === optionValue && 'bg-accent font-medium',
        );

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((isOpen) => !isOpen)}
                className={cn(
                    'flex w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    isSmall ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm',
                    className,
                )}
            >
                <span className="min-w-0 truncate">{selectedLabel}</span>
                <ChevronDown
                    className={cn(
                        'shrink-0 opacity-50',
                        isSmall ? 'size-3.5' : 'size-4',
                    )}
                />
            </button>
            {open && (
                <>
                    <div
                        className={cn(
                            'absolute z-50 mt-1 w-full min-w-60 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md',
                            dropdownClassName,
                        )}
                    >
                        <Input
                            autoFocus
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={isSmall ? 'h-7 text-xs' : 'h-8 text-sm'}
                        />
                        <div className="mt-1 max-h-60 overflow-auto">
                            {allOptionLabel !== undefined && (
                                <button
                                    type="button"
                                    className={optionClass('')}
                                    onClick={() => select('')}
                                >
                                    {allOptionLabel}
                                </button>
                            )}
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={optionClass(option.value)}
                                        onClick={() => select(option.value)}
                                    >
                                        <span className="block truncate">
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="block text-xs font-normal text-muted-foreground">
                                                {option.description}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="fixed inset-0 z-40" onClick={close} />
                </>
            )}
        </div>
    );
}
