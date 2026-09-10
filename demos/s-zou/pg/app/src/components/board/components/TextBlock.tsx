/**
 * TextBlock — section heading + paragraph. Used inside a column to label a
 * sub-section ("Impact Analysis", "Where the Time is Lost") with a short
 * descriptive paragraph below.
 *
 * Bare component (not self-wrapping) — flows into the column card alongside
 * sibling kpi-card / mini-chart components, the way Celonis Studio renders
 * section text inline above its content.
 */

import type { TextBlockSpec } from "@/types/screen-instance";

export interface TextBlockProps {
  spec: TextBlockSpec;
}

/**
 * Heading style matches the canonical Celonis component-title look (same
 * pattern as the Table's title): `text-base font-semibold text-foreground
 * tracking-tight`. The `level` prop is reserved for future hierarchy but
 * doesn't change typography today — Celonis uses one title weight across all
 * board components.
 */
export function TextBlock({ spec }: TextBlockProps) {
  if (!spec.heading && !spec.body) return null;
  return (
    <div className="flex flex-col gap-2">
      {spec.heading && (
        <h4 className="text-base font-semibold text-foreground tracking-tight">
          {spec.heading}
        </h4>
      )}
      {spec.body && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {spec.body}
        </p>
      )}
    </div>
  );
}
