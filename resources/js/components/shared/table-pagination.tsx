import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TablePaginationProps = {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    perPageOptions?: number[];
};

/**
 * "x–y of N" summary, per-page selector and Previous/Next buttons.
 */
export default function TablePagination({
    page,
    perPage,
    total,
    onPageChange,
    onPerPageChange,
    perPageOptions = [10, 20, 50, 100],
}: TablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    return (
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border">
            <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                    {from}–{to} of {total}
                </span>
                <select
                    value={perPage}
                    onChange={(e) => onPerPageChange(Number(e.target.value))}
                    className="flex h-7 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                    {perPageOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <span className="text-xs text-muted-foreground">per page</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="mr-1 size-3.5" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next <ChevronRight className="ml-1 size-3.5" />
                </Button>
            </div>
        </div>
    );
}
