/**
 * SectionDivider — centered section heading with subtle horizontal rule.
 *
 * Matches the "Lagging Metrics" / "Leading Metrics" dividers in the Celonis
 * Control Tower screenshot.
 */

import { cn } from "@/lib/utils";

export interface SectionDividerProps {
  title: string;
  className?: string;
}

export function SectionDivider({ title, className }: SectionDividerProps) {
  return (
    <div className={cn("flex items-center justify-center py-4", className)}>
      <h2 className="text-xl font-semibold text-foreground tracking-tight">
        {title}
      </h2>
    </div>
  );
}
