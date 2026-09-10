import { describe, it, expect } from "vitest";
import { boardHasViewportFillComponent } from "./BoardView";
import { isViewportFill } from "./registry";
import type { BoardView as BoardViewData } from "@/types/screen-instance";

// Regression guard for the flow-vs-fit decision (BoardView). A board hosting a
// canvas component must stay viewport-fit (so Process Explorer / context-model
// fill the screen); a board of content tiles must flow so it scrolls instead of
// squishing on a short window. This is the deep-dive overflow fix.

const board = (kinds: string[]): BoardViewData =>
  ({
    id: "x",
    view_kind: "board",
    columns: [{ components: kinds.map((k) => ({ kind: k }) as never) }],
  }) as BoardViewData;

describe("isViewportFill", () => {
  it("flags the four canvas components", () => {
    for (const k of ["process-explorer", "value-stream-map", "process-orchestration-flow", "context-model"]) {
      expect(isViewportFill(k as never)).toBe(true);
    }
  });
  it("does not flag content tiles", () => {
    for (const k of ["kpi-list", "chart-line", "chart-bar", "stat-callout", "table", "cta-row", "kpi-card", "mini-chart", "text-block", "brand-hero", "insight-card-list", "tab-group"]) {
      expect(isViewportFill(k as never)).toBe(false);
    }
  });
});

describe("boardHasViewportFillComponent (flow vs fit)", () => {
  it("01-analyze shape (has process-explorer) → fit", () => {
    expect(boardHasViewportFillComponent(board(["process-explorer", "insight-card-list"]))).toBe(true);
  });
  it("02-deep-dive shape (cards/charts/table only) → flow", () => {
    expect(boardHasViewportFillComponent(board(["chart-line", "chart-bar", "stat-callout", "table", "cta-row"]))).toBe(false);
  });
  it("detects a fill component in hero or footer too", () => {
    const withFooter = { ...board(["table"]), footer: { kind: "context-model" } } as BoardViewData;
    expect(boardHasViewportFillComponent(withFooter)).toBe(true);
  });

  it("column_groups shape (no top-level columns) does not throw and flows", () => {
    const withGroups = {
      id: "x",
      view_kind: "board",
      column_groups: [
        { columns: [{ components: [{ kind: "kpi-card" }] }] },
      ],
    } as unknown as BoardViewData;
    expect(() => boardHasViewportFillComponent(withGroups)).not.toThrow();
    expect(boardHasViewportFillComponent(withGroups)).toBe(false);
  });

  it("column_groups shape detects a fill component nested in a group", () => {
    const withGroups = {
      id: "x",
      view_kind: "board",
      column_groups: [
        { columns: [{ components: [{ kind: "process-explorer" }] }] },
      ],
    } as unknown as BoardViewData;
    expect(boardHasViewportFillComponent(withGroups)).toBe(true);
  });
});
