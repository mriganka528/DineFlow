"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnalyticsRangeKey } from "../range";

const PRESETS: { key: AnalyticsRangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "last-month", label: "Last Month" },
  { key: "custom", label: "Custom Range" },
];

export function AnalyticsFilters({
  rangeKey,
  from,
  to,
}: {
  rangeKey: AnalyticsRangeKey;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(rangeKey === "custom");
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const selectPreset = (key: AnalyticsRangeKey) => {
    if (key === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => {
          const active = preset.key === rangeKey || (preset.key === "custom" && showCustom && rangeKey === "custom");
          return (
            <Button
              key={preset.key}
              type="button"
              variant="ghost"
              onClick={() => selectPreset(preset.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {preset.key === "custom" && <CalendarRange className="size-3.5" />}
              {preset.label}
            </Button>
          );
        })}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="space-y-1">
            <label htmlFor="range-from" className="text-xs font-medium text-muted-foreground">
              Start date
            </label>
            <Input
              id="range-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="range-to" className="text-xs font-medium text-muted-foreground">
              End date
            </label>
            <Input
              id="range-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button type="button" onClick={applyCustom} disabled={!customFrom || !customTo}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
