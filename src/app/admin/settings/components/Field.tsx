import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

export default function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
                {label}
            </Label>
            {children}
        </div>
    );
}
