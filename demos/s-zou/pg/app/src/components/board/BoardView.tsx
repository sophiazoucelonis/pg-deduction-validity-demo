/**
 * BoardView — generic renderer for a board view (the only view kind today).
 *
 * Reads the typed `BoardView` data shape:
 *   - Optional `hero` component rendered full-width at the top.
 *   - `columns` rendered side-by-side; each column has optional `title` and
 *     `width` ratio, and a vertical stack of components.
 *
 * Layout is intentionally simple — flex row of columns with normalized width
 * ratios, no explicit grid. Sufficient for current screens (Control Tower
 * 3-column, Process Explorer single-column) and the Celonis "Process
 * Analysis" mixed pattern (PE + side panel).
 */

import { useRef, type CSSProperties } from "react";
import type {
  BoardView as BoardViewData,
  BoardColumn,
  Brand,
  ViewComponent,
} from "@/types/screen-instance";
import { useMeasuredHeight } from "@/hooks/use-measured-height";
import { isCompact, isSelfWrapping, isViewportFill, renderComponent } from "./registry";

/** Fixed content height for a canvas component (process-orchestration-flow,
 *  process-explorer, etc.) rendered inside an OverlayPanel — the panel body
 *  is `overflow-y-auto` (unbounded height), so the canvas's internal
 *  `flex-1 min-h-0` chain has nothing to resolve against and collapses to
 *  0 without this. Matches TabGroup's identical CANVAS_TAB_HEIGHT fix. */
const OVERLAY_CANVAS_HEIGHT = 620;

/** Floor for the measured `column_groups` wrapper height when one or more
 *  rows opt into `grow` — keeps both growing rows legible even on a short
 *  window instead of collapsing toward 0. */
const MIN_GROWING_ROWS_HEIGHT = 480;
/** Breathing room below the growing rows before the viewport ends. */
const GROW_BOTTOM_MARGIN = 24;

export interface BoardViewProps {
  data: BoardViewData;
}

export function BoardView({ data }: BoardViewProps) {
  // Hooks run unconditionally, before any early return below — the ref is
  // attached to the column_groups wrapper regardless of whether this board
  // turns out to have a growing row.
  const groupsWrapperRef = useRef<HTMLDivElement>(null);
  const growingRowsHeight = useMeasuredHeight(
    () =>
      window.innerHeight -
      (groupsWrapperRef.current?.getBoundingClientRect().top ?? 0) -
      GROW_BOTTOM_MARGIN,
    MIN_GROWING_ROWS_HEIGHT,
  );

  if (!data.column_groups && (!data.columns || data.columns.length === 0)) {
    return (
      <div className="p-6 text-destructive">
        Board view <code>{data.id}</code> has no columns. Add at least one
        column with at least one component.
      </div>
    );
  }

  const brandStyle = data.brand
    ? ({ "--brand-primary": data.brand.primary_color } as CSSProperties)
    : undefined;

  // Normalize widths into flex ratios. Columns without an explicit width
  // share the remaining space equally.
  const cols = data.columns ?? [];
  const totalWidth = cols.reduce((sum, c) => sum + (c.width ?? 0), 0);
  const unspecifiedCount = cols.filter((c) => c.width == null).length;
  const defaultWidth =
    unspecifiedCount > 0 && totalWidth < 100
      ? (100 - totalWidth) / unspecifiedCount
      : unspecifiedCount > 0
      ? 1
      : 0;

  // Explicit full-canvas opt-in. When `full_canvas: true` and there's exactly
  // one component (typically a process-explorer), it consumes the whole
  // viewport with no hero / padding / column chrome. With the flag absent,
  // process-explorer composes naturally alongside other components (e.g. the
  // Analyze view: PE on the left, insight-card-list on the right).
  const onlyComponent =
    !data.hero && cols.length === 1 && cols[0].components.length === 1
      ? cols[0].components[0]
      : null;
  if (data.full_canvas && onlyComponent) {
    return (
      <div className="font-sans h-full" style={brandStyle}>
        {renderComponent(onlyComponent, { brand: data.brand })}
      </div>
    );
  }

  // Bypass the AssetViewer's auto-overflow chain by anchoring directly to the
  // viewport. Chrome above (breadcrumb 40px + ContentHeader ~58px + borders)
  // sums to ~100px.
  //
  // Three height modes:
  //   - viewport-fit (analyze, context-model, value-chain): the view hosts a
  //     full-height canvas component (Process Explorer / value-stream-map /
  //     context-model / orchestration-flow) that needs a fixed viewport height
  //     for its h-full pan/zoom surface to resolve. No page-level scroll.
  //   - flow (deep-dive, Control Tower, operate-overview / Action View): a board
  //     of content tiles (cards, charts, tables, ±footer). Uses min-height so it
  //     can grow past the viewport; when the window is short, content overflows
  //     and the PAGE SCROLLS instead of squishing everything to fit. This is the
  //     default for any non-canvas board — footer is no longer what triggers it.
  //   - overlay (any view opened inside an OverlayPanel): natural-flow
  //     content with no viewport-derived sizing. The panel body's
  //     overflow-y-auto handles scrolling, so the BoardView itself just
  //     stacks its hero + columns + footer at their natural heights.
  const isOverlay = data.display_mode === "overlay";
  const multiColumnOverlay = isOverlay && cols.length > 1;
  const hasFooter = !!data.footer;
  // A board "fits" the viewport only when it hosts a canvas component. A board
  // of content tiles flows + scrolls (matching the operate-overview pattern).
  const hasFill = boardHasViewportFillComponent(data);
  const nonOverlayFlow = !isOverlay && !hasFill; // footer-bearing boards have no fill either → also flow
  const flowMode = (isOverlay && !multiColumnOverlay) || nonOverlayFlow;
  // Context Model renders no title (BoardPage passes title=undefined for it), so
  // ContentHeader never mounts and flushContent drops the asset-viewer's padding —
  // the ~58px+padding chunk of the standard 100px chrome budget doesn't apply here.
  // Claw back 30px of that toward the canvas rather than leaving it as dead space.
  const isContextModelBoard = boardHasComponentKind(data, "context-model");
  const outerClass = isOverlay
    ? multiColumnOverlay
      ? "font-sans h-full flex flex-col"
      : "font-sans flex flex-col"
    : nonOverlayFlow
    ? isContextModelBoard
      ? "font-sans min-h-[calc(100vh-70px)] flex flex-col"
      : "font-sans min-h-[calc(100vh-100px)] flex flex-col"
    : isContextModelBoard
    ? "font-sans h-[calc(100vh-70px)] flex flex-col"
    : "font-sans h-[calc(100vh-100px)] flex flex-col";
  return (
    <div className={outerClass} style={brandStyle}>
      {data.hero && (
        <div className="px-4 pt-4 flex-shrink-0">
          {renderComponent(data.hero, { brand: data.brand })}
        </div>
      )}

      {data.section_label && (
        <div className="px-4 pt-4 flex-shrink-0">
          <h3 className="text-xl font-bold text-foreground tracking-tight text-center">
            {data.section_label}
          </h3>
        </div>
      )}

      {/* Content area: fills remaining height in viewport-fit mode; takes
       *  natural content height in flow / overlay modes so children stack
       *  tightly and the parent's scroll container handles any overflow. */}
      <div
        className={
          flowMode
            ? "px-4 pt-4 pb-4 flex-shrink-0 overflow-hidden"
            : "px-4 pt-4 pb-4 flex-1 min-h-0 overflow-hidden"
        }
      >
        {data.column_groups
          ? /* Multi-group layout: stacked rows of columns with optional labels.
             * When flow-mode + at least one row opts into `grow` (no canvas
             * component on this board, so it would otherwise shrink to
             * natural content height and leave blank space below on a tall
             * viewport), the wrapper gets a measured MINIMUM height — a
             * floor, not a cap — so `grow` rows have positive extra space to
             * flex-split when content is shorter than the viewport. Grow
             * rows/columns deliberately keep the default flex min-height
             * (content-based, not `min-h-0`): that's what stops them
             * shrinking below their natural size when content is TALLER
             * than the measured floor — the wrapper then simply grows past
             * it and the page scrolls, exactly like today's flow mode.
             * Without `grow` anywhere, this stays a plain unstyled div at
             * natural height — unchanged from before. */
            (() => {
              const hasGrowingRow = flowMode && data.column_groups!.some((g) => g.grow);
              return (
                <div
                  ref={groupsWrapperRef}
                  className="flex flex-col gap-3"
                  style={hasGrowingRow ? { minHeight: growingRowsHeight } : undefined}
                >
                  {data.column_groups!.map((group, groupIdx) => {
                    const groupTotal = group.columns.reduce((s, c) => s + (c.width ?? 0), 0);
                    const groupUnspecified = group.columns.filter((c) => c.width == null).length;
                    const groupDefault =
                      groupUnspecified > 0 && groupTotal < 100
                        ? (100 - groupTotal) / groupUnspecified
                        : groupUnspecified > 0
                        ? 1
                        : 0;
                    const rowGrows = hasGrowingRow && group.grow;
                    return (
                      <div key={groupIdx} className={rowGrows ? "flex flex-col flex-1" : undefined}>
                        {group.label && (
                          <div className="pb-2">
                            <h3 className="text-xl font-bold text-foreground tracking-tight text-center">
                              {group.label}
                            </h3>
                          </div>
                        )}
                        <div
                          className={
                            rowGrows
                              ? "flex flex-row items-stretch gap-3 flex-1"
                              : "flex flex-row items-stretch gap-3"
                          }
                        >
                          {group.columns.map((column, colIdx) => {
                            const w = column.width ?? groupDefault;
                            const cGroups = groupComponentsForColumn(column.components);
                            // A column that's ONLY a table must not be
                            // force-stretched to match a taller sibling (a
                            // chart growing via its own flex-1) — the table's
                            // own flex-1 wrapper would absorb that extra
                            // height as blank space below its last row, no
                            // matter how roomy its `spacious` padding is.
                            // `self-start` opts this column out of the row's
                            // `items-stretch` so it sizes to its own natural
                            // (roomier) content height instead.
                            const isTableOnlyColumn =
                              rowGrows && column.components.length === 1 && column.components[0].kind === "table";
                            return (
                              <div
                                key={colIdx}
                                className={
                                  isTableOnlyColumn
                                    ? "flex flex-col gap-3 min-w-0 self-start"
                                    : "flex flex-col gap-3 min-w-0"
                                }
                                style={{ flex: `${w} 1 0` }}
                              >
                                {renderColumnGroups(
                                  cGroups,
                                  column,
                                  data.brand,
                                  false,
                                  false
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          : /* Standard single-row columns layout */
            <div className="flex flex-row items-stretch gap-3 h-full min-h-0">
              {cols.map((column, idx) => {
                const width = column.width ?? defaultWidth;
                const groups = groupComponentsForColumn(column.components);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden"
                    style={{ flex: `${width} 1 0` }}
                  >
                    {renderColumnGroups(groups, column, data.brand, isOverlay, multiColumnOverlay)}
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* Optional full-width footer below the columns. Action View pattern:
       *  KPI strip (hero) → analytics side-by-side (columns) → main actionable
       *  table (footer). */}
      {data.footer && (
        <div className="px-4 pb-4 flex-shrink-0">
          {renderComponent(data.footer, { brand: data.brand })}
        </div>
      )}
    </div>
  );
}

/** True when any tile on the board is a full-height canvas component, which
 *  makes the board viewport-fit rather than flow. Checks hero, every column's
 *  components, and the footer. */
export function boardHasViewportFillComponent(data: BoardViewData): boolean {
  if (data.hero && isViewportFill(data.hero.kind)) return true;
  if (data.footer && isViewportFill(data.footer.kind)) return true;
  const allColumns =
    data.column_groups?.flatMap((g) => g.columns) ?? data.columns ?? [];
  return allColumns.some((col) =>
    col.components.some((c) => isViewportFill(c.kind)),
  );
}

/** True when any tile on the board is of the given component kind. */
function boardHasComponentKind(data: BoardViewData, kind: string): boolean {
  if (data.hero && data.hero.kind === kind) return true;
  if (data.footer && data.footer.kind === kind) return true;
  const allColumns =
    data.column_groups?.flatMap((g) => g.columns) ?? data.columns ?? [];
  return allColumns.some((col) => col.components.some((c) => c.kind === kind));
}

interface ComponentGroup {
  /** "wrapped" = a shared column card; "bare" = each component renders its
   *  own card. Distinguishes consecutive runs of self-wrapping vs not. */
  kind: "wrapped" | "bare";
  components: ViewComponent[];
}

function groupComponentsForColumn(components: ViewComponent[]): ComponentGroup[] {
  const groups: ComponentGroup[] = [];
  for (const c of components) {
    const groupKind = isSelfWrapping(c) ? "bare" : "wrapped";
    const last = groups[groups.length - 1];
    if (last && last.kind === groupKind) {
      last.components.push(c);
    } else {
      groups.push({ kind: groupKind, components: [c] });
    }
  }
  return groups;
}

function renderColumnGroups(
  groups: ComponentGroup[],
  column: BoardColumn,
  brand: Brand | undefined,
  isOverlay: boolean,
  multiColumnOverlay: boolean,
) {
  return groups.map((group, gIdx) => {
    const titleNode = column.title && gIdx === 0 ? column.title : undefined;
    if (group.kind === "wrapped") {
      return (
        <div
          key={gIdx}
          className="flex flex-col gap-3 rounded-xl border border-[#d3d3dd] bg-card p-4"
        >
          {titleNode && (
            <>
              <h3 className="text-xl font-bold text-foreground tracking-tight text-center">
                {titleNode}
              </h3>
              <div className="h-px bg-[#d3d3dd] -mx-4" />
            </>
          )}
          {group.components.map((c, i) => (
            <div key={i}>
              {renderComponent(c, { brand, composed: true })}
            </div>
          ))}
        </div>
      );
    }
    const isSingle = group.components.length === 1;
    // In the OverlayPanel's overflow-y-auto body, a bare-shrink group gives
    // canvas components (process-orchestration-flow, process-explorer, …) no
    // height to resolve their internal `flex-1 min-h-0` chain against — fix
    // it to OVERLAY_CANVAS_HEIGHT, same as TabGroup's CANVAS_TAB_HEIGHT.
    const overlayFill = isOverlay && !multiColumnOverlay && group.components.some((c) => isViewportFill(c.kind));
    // A group made ENTIRELY of compact kinds (e.g. two stacked stat-callout
    // tiles, no table/chart sibling) has no natural-height component to set
    // the pace — so instead of shrinking to content height and leaving dead
    // space below (the default "compact kinds shrink" rule, meant for a
    // compact tile sharing a column with a table/chart that DOES dominate
    // the height), flex every tile evenly to fill the column's full height.
    // A MIXED group (compact + a table/chart) is unaffected — the compact
    // tile still shrinks so the table/chart keeps controlling the height.
    const allCompact = group.components.every((c) => isCompact(c.kind));
    return (
      <div
        key={gIdx}
        className={
          isOverlay && !multiColumnOverlay
            ? "flex flex-col gap-3 flex-shrink-0"
            : "flex flex-col gap-3 flex-1 min-h-0"
        }
        style={overlayFill ? { height: OVERLAY_CANVAS_HEIGHT } : undefined}
      >
        {titleNode && (
          <h3 className="text-xl font-bold text-foreground tracking-tight text-center">
            {titleNode}
          </h3>
        )}
        {group.components.map((c, i) => (
          <div
            key={i}
            className={
              isSingle
                ? "h-full min-h-0 flex flex-col"
                : isOverlay && !multiColumnOverlay
                ? "flex-shrink-0"
                : isCompact(c.kind) && !allCompact
                ? "flex-shrink-0"
                : "flex-1 min-h-0 flex flex-col"
            }
          >
            {renderComponent(c, { brand, composed: true })}
          </div>
        ))}
      </div>
    );
  });
}
