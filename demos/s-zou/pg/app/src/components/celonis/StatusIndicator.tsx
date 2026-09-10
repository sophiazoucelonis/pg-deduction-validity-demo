/**
 * StatusIndicator — ported from Celonis Emotion `ce-status-indicator` (atom).
 *
 * Source:
 *   <emotion-repo>/libs/emotion/src/lib/atoms/ce-status-indicator/
 *
 * Visual: a small circle with a tinted outer ring + saturated inner dot,
 * optionally followed by a text label. Used for KPI status, process state,
 * agent health, etc.
 *
 * Sizes (per ce-status-indicator.sizes.scss):
 *   - sm: gap=4px,  outer=16px, inner=8px, text=13px
 *   - md: gap=8px,  outer=20px, inner=8px, text=16px (default)
 *
 * Variants (per ce-status-indicator.variants.scss):
 *   default | neutral | process | queued | warning | error | success
 *
 * Each variant has an outer ring (tint) and inner dot (saturated). We map
 * to the Tailwind tokens we mirrored from Emotion (success/destructive/etc.)
 * + light tints for the outer ring.
 */

import { cn } from "@/lib/utils";

export type StatusVariant =
  | "default"
  | "neutral"
  | "process"
  | "queued"
  | "warning"
  | "error"
  | "success";

export type StatusSize = "sm" | "md";

export interface StatusIndicatorProps {
  variant?: StatusVariant;
  size?: StatusSize;
  label?: string;
  hasLabel?: boolean;
  singleLine?: boolean;
  animated?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, { outer: string; inner: string }> = {
  default: { outer: "bg-muted", inner: "bg-muted-foreground" },
  neutral: { outer: "bg-muted", inner: "bg-muted-foreground" },
  process: { outer: "bg-accent/20", inner: "bg-accent" },
  queued: { outer: "bg-warning/20", inner: "bg-warning" },
  warning: { outer: "bg-warning/20", inner: "bg-warning" },
  error: { outer: "bg-destructive/20", inner: "bg-destructive" },
  success: { outer: "bg-success/20", inner: "bg-success" },
};

const sizeConfig: Record<
  StatusSize,
  { gap: string; outer: string; inner: string; text: string }
> = {
  sm: { gap: "gap-1", outer: "w-4 h-4", inner: "w-2 h-2", text: "text-[13px] leading-[14px]" },
  md: { gap: "gap-2", outer: "w-5 h-5", inner: "w-2 h-2", text: "text-base leading-4" },
};

export function StatusIndicator({
  variant = "default",
  size = "md",
  label,
  hasLabel = true,
  singleLine = false,
  animated = false,
  className,
}: StatusIndicatorProps) {
  const v = variantStyles[variant];
  const s = sizeConfig[size];

  return (
    <div
      className={cn(
        "inline-flex items-center max-w-full align-top font-sans",
        s.gap,
        className
      )}
      aria-label={!hasLabel ? label : undefined}
      role={!hasLabel ? "img" : undefined}
    >
      <div
        className={cn(
          "shrink-0 relative grid place-items-center rounded-full",
          s.outer,
          v.outer
        )}
      >
        <span
          className={cn("absolute rounded-full", s.inner, v.inner)}
          aria-hidden
        />
        {animated && (
          <span
            className={cn("absolute rounded-full opacity-30 animate-ping", s.outer, v.inner)}
            aria-hidden
          />
        )}
      </div>
      {hasLabel && label && (
        <span
          className={cn(
            "text-foreground font-normal",
            s.text,
            singleLine && "truncate"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
