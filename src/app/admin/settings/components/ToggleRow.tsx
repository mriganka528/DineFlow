import { Button } from "@/components/ui/button";

export default function ToggleRow({
    title,
    description,
    enabled,
    onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onToggle}
            className="flex w-full  items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-9  text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
        >
            <span className="min-w-0 flex-1  ">
                <span className="block text-sm font-medium leading-snug ">{title}</span>
                <span className="mt-0.5 wrap-break-word whitespace-normal  text-xs leading-snug text-muted-foreground">{description}</span>
            </span>
            <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-muted-foreground/40 '
                    }`}
            >
                <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </span>
        </Button>
    );
}
