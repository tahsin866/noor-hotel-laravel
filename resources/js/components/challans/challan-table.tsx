import {
    CheckSquare,
    Eye,
    MoreVertical,
    Package,
    Pencil,
    Printer,
    Send,
    Square,
    Trash2,
    Undo2,
} from 'lucide-react';
import { challanStatusColors } from '@/components/challans/challan-status';
import type { Challan, ChallanStatus } from '@/components/challans/types';
import StatusBadge from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatAmount, formatDate } from '@/lib/format';

export type ChallanRowHandlers = {
    onView: (challan: Challan) => void;
    onPrint: (challan: Challan) => void;
    onEdit: (challan: Challan) => void;
    onDelete: (challan: Challan) => void;
    onStatusChange: (challan: Challan, status: ChallanStatus) => void;
};

type ChallanTableProps = ChallanRowHandlers & {
    challans: Challan[];
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onToggleSelectAll: () => void;
};

const headCellClass =
    'px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase';

export default function ChallanTable({
    challans,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    ...handlers
}: ChallanTableProps) {
    const allSelected =
        challans.length > 0 && selectedIds.size === challans.length;

    return (
        <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                            <th className="w-10 px-4 py-3 text-center">
                                <SelectToggle
                                    checked={allSelected}
                                    onClick={onToggleSelectAll}
                                />
                            </th>
                            <th className={`${headCellClass} text-left`}>
                                Number
                            </th>
                            <th className={`${headCellClass} text-left`}>PO</th>
                            <th className={`${headCellClass} text-left`}>
                                Party
                            </th>
                            <th className={`${headCellClass} text-left`}>
                                Date
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Qty
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Amount
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Status
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {challans.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-16 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Package className="size-8 opacity-40" />
                                        <p className="text-sm font-medium">
                                            No challans found
                                        </p>
                                        <p className="text-xs">
                                            Create a new challan to get started.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            challans.map((challan) => (
                                <tr
                                    key={challan.id}
                                    className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                >
                                    <td className="w-10 px-4 py-3 text-center">
                                        <SelectToggle
                                            checked={selectedIds.has(
                                                challan.id,
                                            )}
                                            onClick={() =>
                                                onToggleSelect(challan.id)
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs font-semibold">
                                            {challan.challan_number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {challan.po_number || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {challan.party_name || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {formatDate(challan.date)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">
                                        {challan.total_qty}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                                        ৳
                                        {formatAmount(
                                            challan.total_amount || 0,
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge
                                            status={challan.status}
                                            colors={challanStatusColors}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <ChallanRowActions
                                                challan={challan}
                                                {...handlers}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SelectToggle({
    checked,
    onClick,
}: {
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center justify-center"
        >
            {checked ? (
                <CheckSquare className="size-4 text-primary" />
            ) : (
                <Square className="size-4 text-muted-foreground" />
            )}
        </button>
    );
}

/**
 * Per-row menu. The status transitions offered depend on the current status.
 */
function ChallanRowActions({
    challan,
    onView,
    onPrint,
    onEdit,
    onDelete,
    onStatusChange,
}: ChallanRowHandlers & { challan: Challan }) {
    const changeTo = (status: ChallanStatus) => () =>
        onStatusChange(challan, status);

    const cancelItem = (
        <DropdownMenuItem variant="destructive" onClick={changeTo('cancelled')}>
            <Trash2 className="size-3.5" />
            Cancel
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                >
                    <MoreVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(challan)}>
                    <Eye className="size-3.5" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPrint(challan)}>
                    <Printer className="size-3.5" />
                    Print Challan
                </DropdownMenuItem>

                {challan.status === 'pending' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={changeTo('dispatched')}>
                            <Send className="size-3.5" />
                            Dispatch
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(challan)}>
                            <Pencil className="size-3.5" />
                            Edit
                        </DropdownMenuItem>
                        {cancelItem}
                    </>
                )}

                {challan.status === 'dispatched' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={changeTo('delivered')}>
                            <Send className="size-3.5" />
                            Mark Delivered
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={changeTo('pending')}>
                            <Undo2 className="size-3.5" />
                            Return to Pending
                        </DropdownMenuItem>
                        {cancelItem}
                    </>
                )}

                {challan.status === 'delivered' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={changeTo('dispatched')}>
                            <Undo2 className="size-3.5" />
                            Return to Dispatched
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={changeTo('pending')}>
                            <Undo2 className="size-3.5" />
                            Return to Pending
                        </DropdownMenuItem>
                        {cancelItem}
                    </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(challan)}
                >
                    <Trash2 className="size-3.5" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
