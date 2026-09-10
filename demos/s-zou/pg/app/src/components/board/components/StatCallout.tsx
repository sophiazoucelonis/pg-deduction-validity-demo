/**
 * StatCallout — single "small label + headline value" tile. On deep-dive
 * views this surfaces aggregated GenAI record-annotation insights (e.g.
 * "Biggest Pattern: Material staged AFTER scan-required"). The platform
 * pattern: a system prompt with record-field placeholders is executed per
 * row of a table, producing per-row LLM annotations; the most common /
 * highest-impact labels then bubble up here.
 *
 * `tone: "ai-annotated"` renders a subtle Sparkles badge so the audience
 * reads the value as AI-derived rather than a hard-coded query result.
 *
 * `h-full` + `justify-between` let the tile stretch to fill whatever height
 * its parent gives it (e.g. BoardView's "all-compact group" rule, or a
 * `grow: true` column-group row) — the label stays pinned top, the
 * secondary-metric row stays pinned bottom, and the gap between them grows
 * instead of leaving dead space below a natural-height card.
 */

import type { StatCalloutSpec } from "@/types/screen-instance";
import { Sparkles, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCalloutProps {
  spec: StatCalloutSpec;
}

const TREND_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

export function StatCallout({ spec }: StatCalloutProps) {
  const aiAnnotated = spec.tone === "ai-annotated";
  const secondary = spec.secondary_metric;
  const TrendIcon = secondary?.trend ? TREND_ICON[secondary.trend] : null;
  const brandValue = spec.value_color === "brand";
  return (
    <div className="h-full rounded-xl border border-[#d3d3dd] bg-card px-5 py-4 flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] leading-tight font-normal text-muted-foreground">
          {spec.label}
        </span>
        {aiAnnotated && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium tracking-[0.04em] uppercase text-[#264aff]/85"
            title="AI-annotated — derived from per-record LLM annotations aggregated across the dataset."
          >
            <Sparkles className="size-3" aria-hidden="true" />
            AI
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[34px] leading-[1.1] font-semibold tracking-tight",
          brandValue ? "text-[#264aff]" : "text-foreground",
        )}
      >
        {spec.value}
      </span>
      {/* Mutually exclusive by design — secondary_metric wins if an author
       *  sets both, since it's the richer KPI-tile shape caption predates. */}
      {!secondary && spec.caption && (
        <span className="text-[12px] leading-snug text-muted-foreground">
          {spec.caption}
        </span>
      )}
      {secondary && (
        <div className="flex items-center justify-between gap-2 text-[12px] leading-snug">
          <span className="text-muted-foreground">{secondary.label}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            {secondary.value}
            {TrendIcon && <TrendIcon className="size-3.5" aria-hidden="true" />}
          </span>
        </div>
      )}
    </div>
  );
}
