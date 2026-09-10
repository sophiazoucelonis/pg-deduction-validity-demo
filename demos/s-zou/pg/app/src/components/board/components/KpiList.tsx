/**
 * KpiList — horizontal row of inline KPIs inside a single bordered container,
 * separated by thin vertical dividers. The canonical Celonis Studio
 * KPI-overview pattern: label on top, big value below, multiple items
 * side-by-side, no per-tile borders, no decorative fills.
 *
 * Per-item options:
 *   - `tone: "positive"` — green value text + small up-arrow. Reserved for
 *     delta / uplift KPIs (e.g. "+6 pp"). Never invents a tile fill.
 *   - `tooltip` — small info icon next to the name; hover surfaces a popover
 *     with the calculation explanation. Use on the Value Opportunity KPI.
 */

import type { KpiListSpec } from "@/types/screen-instance";
import { ArrowUpRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface KpiListProps {
  spec: KpiListSpec;
}

export function KpiList({ spec }: KpiListProps) {
  if (!spec.items?.length) return null;
  return (
    <div className="rounded-xl border border-[#d3d3dd] bg-card px-6 py-5">
      <div className="flex flex-row items-stretch divide-x divide-[#d3d3dd] -mx-6">
        {spec.items.map((m) => {
          const positive = m.tone === "positive";
          return (
            <div
              key={m.name}
              className="flex flex-col gap-1.5 px-6 min-w-0 flex-1"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] leading-tight font-normal text-muted-foreground truncate">
                  {m.name}
                </span>
                {m.tooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex flex-shrink-0 text-muted-foreground/55 hover:text-foreground transition-colors"
                        aria-label={`Calculation: ${m.name}`}
                      >
                        <Info className="size-3.5" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-relaxed">
                      {m.tooltip}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span
                title={m.value}
                className={cn(
                  "text-[34px] leading-[1.05] font-normal tracking-tight flex items-baseline gap-1.5 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis",
                  positive ? "text-[#26815a]" : "text-foreground",
                )}
              >
                <span className="truncate">{m.value}</span>
                {positive && (
                  <ArrowUpRight
                    className="size-5 self-center text-[#26815a] flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
