import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ConfirmDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** Name of the record being deleted, shown in bold. */
    itemLabel?: ReactNode;
    confirmLabel?: string;
    processing?: boolean;
    onConfirm: () => void;
    /** Optional summary of the record shown under the question. */
    children?: ReactNode;
};

export default function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    itemLabel,
    confirmLabel = 'Delete',
    processing = false,
    onConfirm,
    children,
}: ConfirmDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-50">
                        <AlertTriangle className="size-5 text-red-600" />
                    </div>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{' '}
                        <strong className="text-foreground">{itemLabel}</strong>
                        ? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                {children}
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={processing}
                        onClick={onConfirm}
                    >
                        {processing ? 'Deleting…' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
