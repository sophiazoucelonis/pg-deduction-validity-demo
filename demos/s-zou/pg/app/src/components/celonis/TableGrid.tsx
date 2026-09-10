/**
 * TableGrid — clean Celonis-style table.
 *
 * Visual conventions match the real Celonis tables (per docs and the bordered
 * example in the design library):
 *   - Header row: transparent background, dark semibold text, bottom border.
 *     NO dark/inverted header — that pattern doesn't match real Celonis.
 *   - Body rows: white background, thin bottom border between rows
 *     (--ce-border-subdued = #d3d3dd). Last row's border is omitted.
 *   - Padding: 16px horizontal, ~14px vertical (regular density).
 *   - Typography: 13px body, 13px semibold header — matches `--ce-fontSize-sm`.
 *   - `bordered` adds a 1px outer border with `rounded-lg`.
 *   - `striped` toggles subtle alternating row backgrounds (off by default —
 *     real Celonis uses divider-only rows, no stripes).
 *   - `dense` tightens vertical padding for compact contexts.
 *
 * Usage:
 *   <TableGrid bordered>
 *     <TableGridHeader>
 *       <TableGridHeaderCell>Name</TableGridHeaderCell>
 *       <TableGridHeaderCell>Year</TableGridHeaderCell>
 *       <TableGridHeaderCell align="right">Rating</TableGridHeaderCell>
 *     </TableGridHeader>
 *     <TableGridBody>
 *       <TableGridRow>
 *         <TableGridCell>Ink</TableGridCell>
 *         <TableGridCell>2009</TableGridCell>
 *         <TableGridCell align="right">5</TableGridCell>
 *       </TableGridRow>
 *     </TableGridBody>
 *   </TableGrid>
 */

import { cn } from "@/lib/utils";
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export interface TableGridProps {
  bordered?: boolean;
  striped?: boolean;
  dense?: boolean;
  /** Loosen row padding beyond the default — the counterpart to `dense`.
   *  Ignored when `dense` is also set (dense wins). */
  spacious?: boolean;
  children: ReactNode;
  className?: string;
}

export function TableGrid({
  bordered = false,
  striped = false,
  dense = false,
  spacious = false,
  children,
  className,
}: TableGridProps) {
  return (
    <div
      data-table-grid
      data-striped={striped || undefined}
      data-dense={dense || undefined}
      data-spacious={(spacious && !dense) || undefined}
      className={cn(
        "w-full overflow-x-auto font-sans text-foreground bg-card",
        bordered && "border border-[#d3d3dd] rounded-lg",
        className,
      )}
    >
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export interface TableGridHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableGridHeader({ children, className }: TableGridHeaderProps) {
  return (
    <thead className={cn("border-b border-[#d3d3dd]", className)}>
      <tr>{children}</tr>
    </thead>
  );
}

type Align = "left" | "center" | "right";

const alignClass: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export interface TableGridHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> {
  align?: Align;
  children: ReactNode;
}

export function TableGridHeaderCell({
  align = "left",
  children,
  className,
  ...rest
}: TableGridHeaderCellProps) {
  return (
    <th
      {...rest}
      className={cn(
        "px-4 py-3 text-[13px] leading-4 font-semibold text-foreground whitespace-nowrap",
        alignClass[align],
        "[[data-dense]_&]:py-2",
        "[[data-spacious]_&]:py-4",
        className,
      )}
    >
      {children}
    </th>
  );
}

export interface TableGridRowProps {
  children: ReactNode;
  className?: string;
  /** Optional row-level click handler. When set, the row reads as a button. */
  onClick?: () => void;
  /** Stable identifier used to anchor preparation-mode hotspots. */
  dataPrepId?: string;
}

export function TableGridRow({ children, className, onClick, dataPrepId }: TableGridRowProps) {
  return (
    <tr
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-prep-id={dataPrepId}
      className={cn(
        // Thin divider between rows (skipped on the last row via `last:border-0`).
        "border-b border-[#d3d3dd] last:border-b-0 transition-colors hover:bg-[#fafafd]",
        // Optional striping (off by default — real Celonis tables don't stripe).
        "[[data-striped]_tbody_&]:odd:bg-[#fafafd]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export interface TableGridCellProps
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  align?: Align;
  shrink?: boolean;
  children?: ReactNode;
}

export function TableGridCell({
  align = "left",
  shrink = false,
  children,
  className,
  ...rest
}: TableGridCellProps) {
  return (
    <td
      {...rest}
      className={cn(
        "px-4 py-3.5 text-[13px] leading-[1.4] align-middle text-foreground",
        alignClass[align],
        shrink && "w-px whitespace-nowrap",
        // dense mode tightens vertical padding; spacious loosens it
        "[[data-dense]_&]:py-2",
        "[[data-spacious]_&]:py-5",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableGridBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}
