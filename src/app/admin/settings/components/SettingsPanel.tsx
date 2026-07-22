import  { ReactNode } from 'react'


export default function SettingsPanel({
    icon,
    title,
    description,
    children,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300 sm:p-5 md:p-6">
            <div className="mb-4 flex items-start gap-3 sm:mb-5 md:mb-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold leading-snug">{title}</h2>
                    <p className="text-xs sm:text-sm leading-snug text-muted-foreground">{description}</p>
                </div>
            </div>
            {children}
        </section>
    );
}
