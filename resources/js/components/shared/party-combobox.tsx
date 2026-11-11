import SearchableSelect from '@/components/shared/searchable-select';

export type PartyOption = { id: number; party_name: string };

type PartyComboboxProps = {
    parties: PartyOption[];
    /** Selected party id as a string ('' = none / all). */
    value: string;
    onChange: (value: string) => void;
    /** Show an "All Parties" choice at the top (for list filters). */
    allowAll?: boolean;
    placeholder?: string;
    size?: 'sm' | 'default';
    className?: string;
    dropdownClassName?: string;
};

/**
 * Searchable party picker shared by list filters and create/edit forms.
 */
export default function PartyCombobox({
    parties,
    value,
    onChange,
    allowAll = false,
    placeholder = allowAll ? 'All Parties' : 'Select party',
    size = 'default',
    className,
    dropdownClassName,
}: PartyComboboxProps) {
    return (
        <SearchableSelect
            options={parties.map((party) => ({
                value: String(party.id),
                label: party.party_name,
            }))}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder="Search party..."
            emptyText="No parties found"
            allOptionLabel={allowAll ? 'All Parties' : undefined}
            size={size}
            className={className}
            dropdownClassName={dropdownClassName}
        />
    );
}
