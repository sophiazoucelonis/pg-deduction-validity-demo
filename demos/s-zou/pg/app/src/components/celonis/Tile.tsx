/**
 * Tile — ported from Celonis Emotion `ce-tile` (atom).
 *
 * Source:
 *   <emotion-repo>/libs/emotion/src/lib/atoms/ce-tile/
 *
 * Card-style container for dashboard layouts. Used on Control Tower as the
 * wrapper around each objective column.
 *
 * Visual (per ce-tile.component.scss + Emotion's `c.card` mixin):
 *   - White background
 *   - 1px gray border (border-radius: 4px = ce-borderRadius-md)
 *   - Padding via inner wrapper (space-card; we approximate with p-4 = 16px)
 *   - No shadow by default
 *
 * Variants:
 *   - default: bordered white card
 *   - ghost: no border, transparent (used for nested tiles)
 *
 * Modifiers:
 *   - highlighted: primary-accented border (Celonis blue)
 *   - disabled: muted bg, disabled text
 *
 * Optional title + subtitle props:
 *   - title: body-md-semibold (16px / 16px LH, weight 600)
 *   - subtitle: body-md-regular (16px / 16px LH, weight 400)
 *   - title→subtitle gap: space-2 (8px)
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TileVariant = "default" | "ghost";

export interface TileProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  variant?: TileVariant;
  highlighted?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  /** Header slot: rendered above the title. Useful for icons, badges. */
  header?: ReactNode;
  /** Footer slot: rendered below the children. */
  footer?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<TileVariant, string> = {
  default: "bg-card border border-border",
  ghost: "bg-transparent border-0",
};

export function Tile({
  title,
  subtitle,
  variant = "default",
  highlighted = false,
  disabled = false,
  className,
  contentClassName,
  header,
  footer,
  children,
}: TileProps) {
  return (
    <div
      className={cn(
        "relative block rounded font-sans text-foreground",
        variantStyles[variant],
        highlighted && "border-accent",
        disabled && "bg-muted text-muted-foreground border-border pointer-events-none",
        className
      )}
      aria-disabled={disabled}
    >
      <div className={cn("relative h-full p-4 overflow-hidden", contentClassName)}>
        {header}
        {title && (
          <div className="block text-base leading-4 font-semibold break-words">
            {title}
          </div>
        )}
        {subtitle && (
          <div
            className={cn(
              "block text-base leading-4 font-normal text-muted-foreground",
              title && "mt-2"
            )}
          >
            {subtitle}
          </div>
        )}
        {children && (
          <div className={cn((title || subtitle) && "mt-4")}>{children}</div>
        )}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}
