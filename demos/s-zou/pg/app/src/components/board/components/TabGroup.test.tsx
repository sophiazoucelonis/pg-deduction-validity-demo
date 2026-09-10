// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TabGroup } from "./TabGroup";
import type { TabGroupSpec } from "@/types/screen-instance";

const spec: TabGroupSpec = {
  kind: "tab-group",
  tabs: [
    {
      id: "mining",
      label: "Agent Mining",
      columns: [
        {
          components: [
            { kind: "stat-callout", label: "Conformance", value: "70%" },
          ],
        },
      ],
    },
    {
      id: "details",
      label: "Details",
      count: 6,
      columns: [
        {
          components: [
            {
              kind: "table",
              title: "Deviations",
              columns: [{ key: "name", label: "Name" }],
              rows: [{ name: "Missing event" }],
            },
          ],
        },
      ],
    },
  ],
};

function renderGroup(s: TabGroupSpec) {
  return render(
    <MemoryRouter>
      <TabGroup spec={s} />
    </MemoryRouter>,
  );
}

describe("TabGroup", () => {
  it("renders the first tab's content by default", () => {
    renderGroup(spec);
    expect(screen.getByText("Conformance")).toBeTruthy();
    expect(screen.queryByText("Deviations")).toBeNull();
  });

  it("respects default_tab", () => {
    renderGroup({ ...spec, default_tab: "details" });
    expect(screen.getByText("Deviations")).toBeTruthy();
    expect(screen.queryByText("Conformance")).toBeNull();
  });

  it("switches content when a tab is clicked", () => {
    renderGroup(spec);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("Deviations")).toBeTruthy();
    expect(screen.queryByText("Conformance")).toBeNull();
  });

  it("renders the tab strip labels and badge count", () => {
    renderGroup(spec);
    expect(screen.getByText("Agent Mining")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("flows at natural height for a content-tile tab (no canvas component)", () => {
    renderGroup({ ...spec, default_tab: "details" });
    const contentDiv = screen.getByText("Deviations").closest("div.p-4");
    expect((contentDiv as HTMLElement)?.style.height).toBe("");
  });

  it("fixes height for a tab hosting a canvas component, measured from the viewport", () => {
    // jsdom's default innerHeight is 768 and getBoundingClientRect() on an
    // unlaid-out node returns all zeros, so the measured height should
    // equal innerHeight minus BOTTOM_MARGIN (24) — proving the height comes
    // from a live measurement, not a hardcoded pixel constant.
    const withCanvas: TabGroupSpec = {
      kind: "tab-group",
      tabs: [
        {
          id: "mining",
          label: "Agent Mining",
          columns: [
            {
              components: [
                {
                  kind: "process-explorer",
                  objects: [{ id: "o1", label: "Order", count: "1", color: "#264aff" }],
                  events: [{ id: "e1", label: "Start", count: "1", object_ids: ["o1"] }],
                  connections: [],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <TabGroup spec={withCanvas} />
      </MemoryRouter>,
    );
    const contentDiv = document.querySelector("div.p-4") as HTMLElement;
    expect(contentDiv.style.height).toBe(`${window.innerHeight - 24}px`);
  });

  it("never collapses below the minimum canvas height even if measurement is degenerate", () => {
    // Simulates a viewport too short (or a measurement race) where the
    // naive calculation would go negative — the floor must win.
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 100, configurable: true });
    const withCanvas: TabGroupSpec = {
      kind: "tab-group",
      tabs: [
        {
          id: "mining",
          label: "Agent Mining",
          columns: [
            {
              components: [
                {
                  kind: "process-explorer",
                  objects: [{ id: "o1", label: "Order", count: "1", color: "#264aff" }],
                  events: [{ id: "e1", label: "Start", count: "1", object_ids: ["o1"] }],
                  connections: [],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <TabGroup spec={withCanvas} />
      </MemoryRouter>,
    );
    const contentDiv = document.querySelector("div.p-4") as HTMLElement;
    expect(contentDiv.style.height).toBe("420px");
    Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
  });

  it("lets a content-tile column scroll instead of clipping when a sibling column hosts a canvas", () => {
    // Regression: a tab mixing a canvas column (process-explorer) with a
    // table column used to force BOTH columns into overflow-hidden at the
    // tab's fixed height, silently clipping the table's rows with no way to
    // reach them. The table column must get its own scroll instead.
    const mixed: TabGroupSpec = {
      kind: "tab-group",
      tabs: [
        {
          id: "mining",
          label: "Agent Mining",
          columns: [
            {
              width: 70,
              components: [
                {
                  kind: "process-explorer",
                  objects: [{ id: "o1", label: "Order", count: "1", color: "#264aff" }],
                  events: [{ id: "e1", label: "Start", count: "1", object_ids: ["o1"] }],
                  connections: [],
                },
              ],
            },
            {
              width: 30,
              components: [
                {
                  kind: "table",
                  title: "Side Panel",
                  columns: [{ key: "name", label: "Name" }],
                  rows: [{ name: "Row 1" }],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <TabGroup spec={mixed} />
      </MemoryRouter>,
    );
    const columns = document.querySelectorAll("div.p-4 > div > div[style*='flex']");
    const tableColumn = [...columns].find((el) => el.textContent?.includes("Side Panel")) as HTMLElement;
    expect(tableColumn.className).toContain("overflow-y-auto");
    expect(tableColumn.className).not.toContain("overflow-hidden");
  });

  it("stretches a lone component in a content-tile column to the column's full height", () => {
    // Regression: the Details tab's solo "Deviations" table (alone in its
    // column) used to shrink to its own natural height while its sibling
    // column (Execution Log + Outlier Trend, two components) stretched
    // taller — leaving visible dead space below the Deviations table
    // instead of the table growing to match. A column with exactly ONE
    // component must stretch that component full-height, same as
    // BoardView's own `isSingle` rule.
    const detailsShape: TabGroupSpec = {
      kind: "tab-group",
      tabs: [
        {
          id: "details",
          label: "Details",
          columns: [
            {
              width: 45,
              components: [
                {
                  kind: "table",
                  title: "Deviations",
                  columns: [{ key: "name", label: "Name" }],
                  rows: [{ name: "Row 1" }],
                },
              ],
            },
            {
              width: 55,
              components: [
                {
                  kind: "table",
                  title: "Execution Log",
                  columns: [{ key: "name", label: "Name" }],
                  rows: [{ name: "Row 1" }],
                },
                {
                  kind: "chart-bar",
                  title: "Outlier Trend",
                  categories: ["A"],
                  series: [{ key: "v", label: "V" }],
                  rows: [{ category: "A", v: 1 }],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <TabGroup spec={detailsShape} />
      </MemoryRouter>,
    );
    const deviationsCard = screen.getByText("Deviations").closest("div.rounded-xl");
    const deviationsWrapper = deviationsCard?.parentElement;
    expect(deviationsWrapper?.className).toContain("flex-1");
    expect(deviationsWrapper?.className).not.toContain("flex-shrink-0");
  });

  it("respects default_all_visible via the process-explorer spec passthrough", () => {
    // Smoke check that TabGroup passes the spec through unmodified — the
    // actual default-visibility behavior is unit-tested directly in
    // ProcessExplorer.test.ts (defaultVisibleLaneIds). This just confirms
    // TabGroup doesn't strip or ignore the field on the way through.
    const withAllVisible: TabGroupSpec = {
      kind: "tab-group",
      tabs: [
        {
          id: "mining",
          label: "Agent Mining",
          columns: [
            {
              components: [
                {
                  kind: "process-explorer",
                  default_all_visible: true,
                  objects: [
                    { id: "o1", label: "Order", count: "1", color: "#264aff" },
                    { id: "o2", label: "Agent", count: "1", color: "#ee14f8", is_agent: true },
                  ],
                  events: [
                    { id: "e1", label: "Start", count: "1", object_ids: ["o1"] },
                    { id: "e2", label: "Agent Step", count: "1", object_ids: ["o2"] },
                  ],
                  connections: [],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <TabGroup spec={withAllVisible} />
      </MemoryRouter>,
    );
    // Both object labels should render on the canvas — proof both lanes are
    // visible on mount, not just the (nonexistent, since neither is
    // is_focal) fallback first lane.
    expect(screen.getByText("Order")).toBeTruthy();
    expect(screen.getByText("Agent")).toBeTruthy();
  });
});
