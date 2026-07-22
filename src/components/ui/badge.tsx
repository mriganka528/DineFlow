import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline"
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-zinc-950 text-white",
        variant === "secondary" && "bg-emerald-50 text-emerald-700",
        variant === "outline" && "border border-zinc-200 bg-white text-zinc-700",
        className,
      )}
      {...props}
    />
  )
}
