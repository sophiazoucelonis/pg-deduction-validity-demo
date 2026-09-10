/**
 * HeaderStrip — Control Tower header.
 *
 * Renders the screen title (left) + an inline metrics row (right) with
 * key enterprise figures (Revenue, COGS, Gross Profit Margin, Value Realized).
 *
 * Visual reference: page 3 of FY27 - Order to Delivery - Automotive - Talk Track.pdf.
 */

import type { TopMetric } from "@/types/screen-instance";
import { Badge } from "@/components/celonis/Badge";

export interface HeaderStripProps {
  title: string;
  topMetrics: TopMetric[];
}

/** Highlight the last metric ("Value Realized") with a brand-blue badge — matches the FY27 screenshot. */
function isHighlighted(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("value realized") || n.includes("value at risk");
}

export function HeaderStrip({ title, topMetrics }: HeaderStripProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
      <h1 className="text-2xl leading-tight font-semibold text-foreground tracking-tight">
        {title}
      </h1>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {topMetrics.map((m) => (
          <div key={m.name} className="flex items-baseline gap-2">
            <span className="text-xs font-normal uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              {m.name}
            </span>
            {isHighlighted(m.name) ? (
              <Badge variant="default" size="sm">
                {m.value}
              </Badge>
            ) : (
              <span className="text-base font-semibold text-foreground">
                {m.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
