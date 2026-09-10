/**
 * KpiTile — generic KPI display (one label + one value).
 *
 * Counterpart to Emotion's `ce-kpi-item`. The component is granular: a single
 * KpiTile shows ONE KPI. Composition into rows of multiple KPIs is done by the
 * parent screen (e.g. ObjectiveColumn).
 *
 * Works for any KPI type — labels and values are free strings, so percentages,
 * durations, counts, and dollar amounts all render through the same component:
 *
 *   <KpiTile variant="kpi-text" label="OTD Rate"       value="92%"      status="good" />
 *   <KpiTile variant="kpi-text" label="OTIF"           value="48%"      status="bad" />
 *   <KpiTile variant="kpi-text" label="Throughput"     value="84 days" />
 *   <KpiTile variant="potential" label="Potential Value" value="$22M" />
 *
 * Sizes/weights/colors taken from the real Celonis CSS for `kpi-item` and
 * `display-rules__wrapper--label` (extracted from the FY26 GBS HTML export):
 *   - Label: 13px, regular, --ce-content (dark navy). We render slightly muted
 *     to match the visual appearance in the real product screenshots.
 *   - Value: clamp(20px, 2.2vw, 36px), font-weight 400 (regular). Real CSS uses
 *     clamp(14px, 1.4vw, 56px) for the md variant — we tighten the range so it
 *     reads as a hero KPI in our smaller column layout.
 *   - Bad indicator: an SVG diagonal-down-right arrow icon at 24x24 with
 *     order: 10 + margin-left: 8px (matches `display-rules__icon--right-aligned`).
 *   - Pill: 12px border-radius, 4px/8px padding, white text on brand color.
 *
 * Three variants:
 *   - "kpi-text"  → text-only. Status="bad" → text turns red + SVG arrow icon.
 *   - "potential" → solid pill in `var(--brand-primary)` (customer brand color),
 *                   falling back to Celonis purple #5B47E0.
 *   - "pill"      → legacy status-colored pill (good/warning/bad).
 */

import { cn } from "@/lib/utils";

export type KpiTileStatus = "good" | "warning" | "bad" | "neutral" | "info";
export type KpiTileVariant = "pill" | "potential" | "kpi-text";

export interface KpiTileProps {
  label: string;
  value: string | number;
  status?: KpiTileStatus;
  variant?: KpiTileVariant;
  size?: "lg" | "md";
  className?: string;
}

const pillStatusStyles: Record<KpiTileStatus, string> = {
  good:    "bg-[#26815a] text-white",
  warning: "bg-[#e97408] text-black",
  bad:     "bg-[#ea0b20] text-white",
  neutral: "bg-muted text-foreground",
  info:    "bg-accent/15 text-accent",
};

// Matches real Celonis `kpi-item__value` sizing — responsive clamp() so the
// value scales down as the column narrows, instead of overflowing or truncating
// with ellipsis. Real CSS uses `clamp(14px, 1.4vw, 56px)`; we tighten the max so
// values like "84 days" / "3.2K units" / "$22M" fit comfortably inside the
// ~170px-wide tile at the typical 1500–1920px viewport range.
const valueSize: Record<"lg" | "md", string> = {
  lg: "text-[clamp(18px,1.5vw,30px)] leading-[1.2] font-normal",
  md: "text-[clamp(16px,1.1vw,22px)] leading-[1.2] font-normal",
};

const pillPadding = "px-2 py-1 rounded-xl"; // 4px 8px (--ce-space-1 --ce-space-2), 12px radius

const ALARM_RED = "#ea0b20";

/**
 * Diagonal-down-right arrow icon — exact path from the real Celonis HTML
 * (`display-rules__icon` SVG). Used as the bad-status indicator next to a KPI.
 */
function DeclineArrow({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10.75 21.005a.75.75 0 1 1 0-1.5h7.67l-15.2-15.2a.765.765 0 1 1 1.081-1.081l15.2 15.2v-7.67a.75.75 0 0 1 1.5 0v9.5a.75.75 0 0 1-.75.75z" />
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  status = "neutral",
  variant = "pill",
  size = "lg",
  className,
}: KpiTileProps) {
  const isBadText = variant === "kpi-text" && status === "bad";

  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      <span className="text-[13px] font-normal text-muted-foreground truncate">
        {label}
      </span>

      {variant === "kpi-text" && (
        <div
          className={cn("inline-flex items-center gap-2 tracking-tight", valueSize[size])}
          style={isBadText ? { color: ALARM_RED } : undefined}
          title={String(value)}
        >
          <span className="truncate">{value}</span>
          {isBadText && <DeclineArrow className="flex-shrink-0 ml-1" />}
        </div>
      )}

      {variant === "potential" && (
        <div
          className={cn(
            "inline-flex w-fit items-center tracking-tight text-white",
            valueSize[size],
            pillPadding,
          )}
          style={{ backgroundColor: "var(--brand-primary, #5B47E0)" }}
          title={String(value)}
        >
          {value}
        </div>
      )}

      {variant === "pill" && (
        <div
          className={cn(
            "inline-flex w-fit items-center tracking-tight",
            pillStatusStyles[status],
            valueSize[size],
            pillPadding,
          )}
          title={String(value)}
        >
          {value}
        </div>
      )}
    </div>
  );
}
