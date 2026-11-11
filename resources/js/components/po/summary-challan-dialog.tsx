import { ClipboardList, Printer } from 'lucide-react';
import { useState } from 'react';
import type {
    SummaryChallanData,
    SummaryChallanOptions,
} from '@/components/po/summary-challan';
import {
    buildSummaryGroups,
    printSummaryChallans,
} from '@/components/po/summary-challan';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/format';
import { formatMealType } from '@/lib/meals';

const checkboxClass =
    'data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600';

type SummaryChallanDialogProps = {
    data: SummaryChallanData | null;
    onOpenChange: (open: boolean) => void;
};

/**
 * Options for printing a PO's summary challan(s): whether to show dates,
 * whether to list the challans, and how many challans go into each summary.
 */
export default function SummaryChallanDialog({
    data,
    onOpenChange,
}: SummaryChallanDialogProps) {
    return (
        <Dialog open={data !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                {data && (
                    <SummaryOptions
                        key={data.po_number}
                        data={data}
                        onDone={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function SummaryOptions({
    data,
    onDone,
}: {
    data: SummaryChallanData;
    onDone: () => void;
}) {
    const totalChallans = data.challans.length;
    const [options, setOptions] = useState<SummaryChallanOptions>({
        challansPerSummary: 0,
        showDates: true,
        listChallans: false,
    });

    const groups = buildSummaryGroups(data, options.challansPerSummary);
    const update = (patch: Partial<SummaryChallanOptions>) =>
        setOptions((prev) => ({ ...prev, ...patch }));

    const presets = [0, 10, 15, 30].filter(
        (size) => size === 0 || size < totalChallans,
    );

    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4.5 text-muted-foreground" />
                    Summary Challan — {data.po_number}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    {data.client} · {totalChallans} challan
                    {totalChallans === 1 ? '' : 's'} (cancelled ones excluded)
                </DialogDescription>
            </DialogHeader>

            {totalChallans === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    No challans have been created for this PO yet.
                </p>
            ) : (
                <div className="max-h-[60vh] space-y-5 overflow-y-auto py-1 pr-1">
                    <div className="grid gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Challans per summary
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {presets.map((size) => (
                                <Button
                                    key={size}
                                    type="button"
                                    size="sm"
                                    variant={
                                        options.challansPerSummary === size
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() =>
                                        update({ challansPerSummary: size })
                                    }
                                >
                                    {size === 0 ? 'All in one' : size}
                                </Button>
                            ))}
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                    Custom
                                </span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={totalChallans}
                                    value={options.challansPerSummary || ''}
                                    placeholder="All"
                                    onChange={(e) =>
                                        update({
                                            challansPerSummary: Math.max(
                                                0,
                                                parseInt(e.target.value) || 0,
                                            ),
                                        })
                                    }
                                    className="h-8 w-20 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2.5">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="summary_show_dates"
                                checked={options.showDates}
                                onCheckedChange={(checked) =>
                                    update({ showDates: checked === true })
                                }
                                className={checkboxClass}
                            />
                            <Label
                                htmlFor="summary_show_dates"
                                className="cursor-pointer text-sm font-medium"
                            >
                                Show dates (delivery date and period)
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="summary_list_challans"
                                checked={options.listChallans}
                                onCheckedChange={(checked) =>
                                    update({ listChallans: checked === true })
                                }
                                className={checkboxClass}
                            />
                            <Label
                                htmlFor="summary_list_challans"
                                className="cursor-pointer text-sm font-medium"
                            >
                                List included challan numbers
                            </Label>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Preview — {groups.length} summary challan
                            {groups.length === 1 ? '' : 's'}
                        </Label>
                        {groups.map((group, index) => (
                            <div
                                key={group.ref}
                                className="rounded-lg border border-border bg-muted/30 p-3 text-xs"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold">
                                        Summary {index + 1} ·{' '}
                                        <span className="font-mono">
                                            {group.ref}
                                        </span>
                                    </span>
                                    <span className="text-muted-foreground">
                                        {group.challans.length} challans
                                        {group.from &&
                                            ` · ${formatDate(group.from)} – ${formatDate(group.to)}`}
                                    </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {group.items.map((item, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full border border-border bg-background px-2 py-0.5"
                                            title={item.description}
                                        >
                                            {item.meal_type
                                                ? formatMealType(item.meal_type)
                                                : item.description}{' '}
                                            <strong>{item.quantity}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    disabled={totalChallans === 0}
                    onClick={() => {
                        printSummaryChallans(data, options);
                        onDone();
                    }}
                    className="min-w-28"
                >
                    <Printer className="mr-1.5 size-4" />
                    Print{groups.length > 1 ? ` ${groups.length}` : ''}
                </Button>
            </DialogFooter>
        </>
    );
}
