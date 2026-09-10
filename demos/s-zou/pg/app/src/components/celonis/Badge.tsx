/**
 * Badge — ported from Celonis Emotion `ce-badge` (atom).
 *
 * Source:
 *   <emotion-repo>/libs/emotion/src/lib/atoms/ce-badge/
 *
 * Pill-shaped label for compact status / categorization. Used on the Control
 * Tower for the "potential value" chips ($15M, $36M, …) and Top AI Opportunity
 * indicators.
 *
 * Variants (per ce-badge.variants.scss):
 *   default | neutral | error | warning | success
 *   - default: blue tint (info), the most common
 *   - neutral: gray
 *   - error/warning/success: status colors
 *
 * Sizes (per ce-badge.sizes.scss):
 *   - sm: padding 1px/8px, text 13px medium    (default)
 *   - md: padding 4px/8px, text 16px medium
 *   - lg: padding 8px/12px, text 16px medium
 *
 * Bordered variant adds an outline (subtracted from padding to keep dimensions).
 *
 * NOTE: We aliased this away from shadcn's existing `Badge` (which has its own
 * variants). Import explicitly from `@/components/celonis/Badge` to use this one.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeVariant = "default" | "neutral" | "error" | "warning" | "success";
export type BadgeSize = "sm" | "md" | "lg";

export interface CelonisBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  bordered?: boolean;
  singleLine?: boolean;
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/30",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  error: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  // padding-y / padding-x / text-size + leading + weight
  sm: "px-2 py-px text-[13px] leading-[14px] font-medium",
  md: "px-2 py-1 text-base leading-4 font-medium",
  lg: "px-3 py-2 text-base leading-4 font-medium",
};

export function Badge({
  variant = "default",
  size = "sm",
  bordered = false,
  singleLine = false,
  iconBefore,
  iconAfter,
  children,
  className,
}: CelonisBadgeProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-sans",
        s,
        v.bg,
        v.text,
        bordered && cn("border", v.border),
        singleLine && "max-w-full",
        className
      )}
    >
      {iconBefore}
      <span className={cn(singleLine && "truncate")}>{children}</span>
      {iconAfter}
    </span>
  );
}
