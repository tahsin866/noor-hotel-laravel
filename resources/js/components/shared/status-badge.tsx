import { cn } from '@/lib/utils';

type StatusBadgeProps = {
    status: string;
    /** Tailwind classes per status value. */
    colors: Record<string, string>;
    /** Text to show instead of the raw status value. */
    label?: string;
    bordered?: boolean;
    className?: string;
};

export default function StatusBadge({
    status,
    colors,
    label,
    bordered = true,
    className,
}: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                bordered && 'border',
                colors[status] || 'bg-slate-100 text-slate-600',
                className,
            )}
        >
            {label ?? status}
        </span>
    );
}
