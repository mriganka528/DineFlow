export type AnalyticsRangeKey = "7d" | "30d" | "last-month" | "custom";

export type ResolvedRange = {
  key: AnalyticsRangeKey;
  start: Date;
  end: Date;
  label: string;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Resolves an analytics filter selection into a concrete [start, end] window.
 * Falls back to "Last 30 Days" for unknown or invalid input.
 */
export function resolveAnalyticsRange(
  key: AnalyticsRangeKey | undefined,
  from?: string,
  to?: string,
): ResolvedRange {
  const now = new Date();
  const todayEnd = endOfDay(now);

  if (key === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return {
        key: "custom",
        start: startOfDay(start),
        end: endOfDay(end),
        label: "Custom Range",
      };
    }
  }

  if (key === "7d") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { key: "7d", start, end: todayEnd, label: "Last 7 Days" };
  }

  if (key === "last-month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { key: "last-month", start, end, label: "Last Month" };
  }

  // Default: last 30 days
  const start = startOfDay(now);
  start.setDate(start.getDate() - 29);
  return { key: "30d", start, end: todayEnd, label: "Last 30 Days" };
}
