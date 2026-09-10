// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BoardView } from "./BoardView";
import type { BoardView as BoardViewData } from "@/types/screen-instance";

// Regression guard for the "all-compact group flexes evenly" fix: a bare
// group made ENTIRELY of compact kinds (stat-callout / cta-row / brand-hero)
// with no table/chart sibling should flex to fill the column's height
// (flex-1), matching a sibling column's chart/table height instead of
// shrinking to natural content height and leaving dead space below. A
// MIXED group (a compact tile alongside a table/chart) keeps the original
// shrink behavior so the table/chart still controls the height.

function renderBoard(data: BoardViewData) {
  return render(
    <MemoryRouter>
      <BoardView data={data} />
    </MemoryRouter>,
  );
}

describe("BoardView — all-compact group height", () => {
  it("flexes every tile in an all-compact group (stat-callout + stat-callout, no table/chart)", () => {
    const data = {
      id: "x",
      view_kind: "board",
      columns: [
        {
          components: [
            { kind: "stat-callout", label: "Hours Saved", value: "5,500 h" },
            { kind: "stat-callout", label: "Live Agents", value: "68" },
          ],
        },
      ],
    } as unknown as BoardViewData;
    renderBoard(data);
    const hoursSaved = screen.getByText("Hours Saved").closest("div.h-full");
    const tileWrapper = hoursSaved?.parentElement;
    expect(tileWrapper?.className).toContain("flex-1");
    expect(tileWrapper?.className).not.toContain("flex-shrink-0");
  });

  it("keeps the shrink behavior for a MIXED group (stat-callout beside a table)", () => {
    const data = {
      id: "x",
      view_kind: "board",
      columns: [
        {
          components: [
            { kind: "stat-callout", label: "Biggest Pattern", value: "Late Payment" },
            {
              kind: "table",
              title: "Drivers",
              columns: [{ key: "name", label: "Name" }],
              rows: [{ name: "Row 1" }],
            },
          ],
        },
      ],
    } as unknown as BoardViewData;
    renderBoard(data);
    const statTile = screen.getByText("Biggest Pattern").closest("div.h-full");
    const tileWrapper = statTile?.parentElement;
    expect(tileWrapper?.className).toContain("flex-shrink-0");
  });
});
