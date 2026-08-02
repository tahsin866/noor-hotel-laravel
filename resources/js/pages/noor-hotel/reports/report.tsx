import { Head } from '@inertiajs/react';
import { BarChart3 } from 'lucide-react';
import Heading from '@/components/heading';

export default function Report({ title = 'Report', description = 'View payment and invoice reports' }: { title?: string; description?: string }) {
    return (
        <>
            <Head title={title} />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <BarChart3 className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title={title} description={description} />
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    {title} coming soon
                </div>
            </div>
        </>
    );
}
