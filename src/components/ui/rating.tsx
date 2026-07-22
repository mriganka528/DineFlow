import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type RatingStatsView = {
  average: number;
  count: number;
  distribution?: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

/**
 * Compact rating summary, e.g. "★ 4.7 • 128 Reviews".
 * Shows "Not Rated Yet" (never "0.0") when there are no ratings.
 */
export function RatingSummary({
  average,
  count,
  className,
  size = "sm",
}: {
  average: number;
  count: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const starSize = size === "md" ? "size-4" : "size-3.5";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  if (count === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", textSize, className)}>
        <Star className={cn(starSize, "opacity-40")} aria-hidden />
        Not Rated Yet
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", textSize, className)}>
      <Star className={cn(starSize, "fill-amber-400 text-amber-400")} aria-hidden />
      <span>{average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        • {count} {count === 1 ? "Review" : "Reviews"}
      </span>
    </span>
  );
}

/**
 * Row of 5 stars filled to reflect the average.
 */
export function StarRow({
  average,
  className,
  starClassName,
}: {
  average: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= Math.round(average) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            starClassName,
          )}
        />
      ))}
    </div>
  );
}

/**
 * Full rating breakdown: big average, star row, total, and per-star bars.
 * Shows "Not Rated Yet" when there are no ratings.
 */
export function RatingDistribution({
  average,
  count,
  distribution,
  className,
}: RatingStatsView & { className?: string }) {
  if (count === 0 || !distribution) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 py-4 text-center", className)}>
        <StarRow average={0} />
        <p className="text-sm font-medium text-muted-foreground">Not Rated Yet</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6", className)}>
      <div className="flex flex-col items-center gap-1 sm:min-w-24">
        <span className="text-3xl font-bold leading-none">{average.toFixed(1)}</span>
        <StarRow average={average} />
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "Review" : "Reviews"}
        </span>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const value = distribution[star as 1 | 2 | 3 | 4 | 5];
          const pct = count > 0 ? (value / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="inline-flex w-6 items-center gap-0.5 text-muted-foreground">
                {star}
                <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right text-muted-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
