/**
 * TabGroup — internal tab strip inside a single board view (no routing, no
 * URL change). Each tab's content is a mini board-column layout — reuses the
 * same side-by-side-columns rendering BoardView applies at the top level, so
 * a tab can be one full-width canvas component (process-explorer) or a
 * multi-column stack (table + table + chart).
 *
 * Self-wrapping — owns its card border + the underline tab strip. Height is
 * per-tab, mirroring BoardView's own flow-vs-fit split: a tab hosting a
 * canvas component (process-explorer, value-stream-map, …) needs SOME fixed
 * pixel height for the canvas's `h-full` chain to resolve; a tab of content
 * tiles (tables, charts) flows at natural height instead, so it can grow
 * without clipping — matching how the top-level BoardView never
 * fixed-heights a table-only board either.
 *
 * A `tab-group` living inside an OverlayPanel sits in the overlay's
 * NATURAL-FLOW branch (BoardView gives a single-column overlay no `h-full`
 * ancestor — see BoardView.tsx's `flowMode` — because most overlay content
 * is a stack of cards that should scroll, not fit). That means a canvas tab
 * can't inherit height from its ancestors; it has to measure the real
 * viewport directly, the same way OverlayPanel measures `window.innerWidth`
 * for its own drag-resize. A hardcoded pixel constant here would either
 * waste space on a tall monitor or clip on a short one — it can never track
 * "fit the screen" for every viewport size.
 */

import type { BoardColumn, TabGroupSpec } from "@/types/screen-instance";
import { useRef, useState } from "react";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { useMeasuredHeight } from "@/hooks/use-measured-height";
import { isCompact, isSelfWrapping, isViewportFill, renderComponent } from "../registry";

export interface TabGroupProps {
  spec: TabGroupSpec;
}

/** Floor so an early/degenerate layout measurement never collapses the
 *  canvas to an unusably short strip. */
const MIN_CANVAS_TAB_HEIGHT = 420;
/** Breathing room below the canvas before the viewport (or the overlay
 *  panel's own bottom edge) ends. */
const BOTTOM_MARGIN = 24;

/** Measures how much vertical space is actually available below this
 *  element for the rest of the viewport. `bottom`, not `top` — the canvas
 *  renders BELOW the tab strip this ref is attached to, so the space it can
 *  use is whatever's left under the strip's bottom edge, not under its top. */
function useAvailableHeight(ref: React.RefObject<HTMLElement>): number {
  return useMeasuredHeight(
    () => window.innerHeight - (ref.current?.getBoundingClientRect().bottom ?? 0) - BOTTOM_MARGIN,
    MIN_CANVAS_TAB_HEIGHT,
  );
}

function columnHasCanvas(column: BoardColumn): boolean {
  return column.components.some((c) => isViewportFill(c.kind));
}

function tabHasCanvas(columns: BoardColumn[]): boolean {
  return columns.some(columnHasCanvas);
}

function renderTabColumns(columns: BoardColumn[], fit: boolean) {
  const total = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
  const unspecified = columns.filter((c) => c.width == null).length;
  const defaultWidth =
    unspecified > 0 && total < 100 ? (100 - total) / unspecified : unspecified > 0 ? 1 : 0;
  return (
    <div className={fit ? "flex flex-row items-stretch gap-3 h-full min-h-0" : "flex flex-row items-stretch gap-3"}>
      {columns.map((column, idx) => {
        const width = column.width ?? defaultWidth;
        // A tab can mix a canvas column (process-explorer) with a
        // content-tile column (table) side by side. The canvas column needs
        // the fixed-height overflow-hidden treatment for its `h-full` chain
        // to resolve; a content-tile sibling gets its own scroll instead of
        // being clipped with no way to reach the rest of its rows.
        const columnFit = fit && columnHasCanvas(column);
        return (
          <div
            key={idx}
            className={
              columnFit
                ? "flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden"
                : fit
                ? "flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto"
                : "flex flex-col gap-3 min-w-0"
            }
            style={{ flex: `${width} 1 0` }}
          >
            {column.title && (
              <h3 className="text-xl font-bold text-foreground tracking-tight text-center">
                {column.title}
              </h3>
            )}
            {column.components.map((c, i) => {
              // A column with exactly ONE component (e.g. the Details tab's
              // solo "Deviations" table beside a 2-component "Execution Log
              // + Outlier Trend" column) must stretch that single component
              // to the column's full height — matching BoardView's own
              // `isSingle` rule. Without this, `items-stretch` on the outer
              // flex row equalizes the COLUMN divs to the tallest sibling,
              // but a `flex-shrink-0` child inside stays at its own natural
              // height, leaving visible dead space below its border instead
              // of the table/chart itself growing to fill it.
              const isSingle = column.components.length === 1;
              return (
                <div
                  key={i}
                  className={
                    isSingle && !columnFit
                      ? "flex-1 min-h-0 flex flex-col"
                      : !columnFit
                      ? "flex-shrink-0"
                      : isSelfWrapping(c) && !isCompact(c.kind)
                      ? "flex-1 min-h-0 flex flex-col"
                      : "flex-shrink-0"
                  }
                >
                  {renderComponent(c, { composed: true })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function TabGroup({ spec }: TabGroupProps) {
  const [activeTab, setActiveTab] = useState(spec.default_tab ?? spec.tabs[0]?.id);
  // Hooks run unconditionally, before the `!active` early return below —
  // the ref is attached to the tab strip's wrapper regardless of whether
  // the active tab turns out to need a canvas height.
  const headerRef = useRef<HTMLDivElement>(null);
  const availableHeight = useAvailableHeight(headerRef);

  const active = spec.tabs.find((t) => t.id === activeTab) ?? spec.tabs[0];
  if (!active) return null;
  const fit = tabHasCanvas(active.columns);

  return (
    <div className="flex flex-col rounded-xl border border-[#d3d3dd] bg-card overflow-hidden">
      <div ref={headerRef} className="px-5 pt-3">
        <UnderlineTabs
          tabs={spec.tabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
          activeTab={active.id}
          onTabChange={setActiveTab}
        />
      </div>
      <div className="p-4" style={fit ? { height: availableHeight } : undefined}>
        {renderTabColumns(active.columns, fit)}
      </div>
    </div>
  );
}
