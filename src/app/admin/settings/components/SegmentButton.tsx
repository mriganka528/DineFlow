import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function SegmentButton({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs sm:text-sm font-medium transition sm:gap-2 sm:px-3 sm:h-10 ${active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
        >
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </Button>
    );
}
