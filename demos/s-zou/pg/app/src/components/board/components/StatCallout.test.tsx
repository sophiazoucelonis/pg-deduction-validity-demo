// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCallout } from "./StatCallout";
import type { StatCalloutSpec } from "@/types/screen-instance";

describe("StatCallout", () => {
  it("renders caption when secondary_metric is absent", () => {
    render(
      <StatCallout
        spec={{ kind: "stat-callout", label: "Biggest Pattern", value: "Late Payment", caption: "$2.1M of $5M" }}
      />,
    );
    expect(screen.getByText("$2.1M of $5M")).toBeTruthy();
  });

  it("renders secondary_metric when caption is absent", () => {
    render(
      <StatCallout
        spec={{
          kind: "stat-callout",
          label: "Hours Saved",
          value: "5,500 h",
          secondary_metric: { label: "FTE Equivalent", value: "3.1 FTE", trend: "up" },
        }}
      />,
    );
    expect(screen.getByText("FTE Equivalent")).toBeTruthy();
    expect(screen.getByText("3.1 FTE")).toBeTruthy();
  });

  it("prefers secondary_metric over caption when both are set, rather than rendering both", () => {
    const spec: StatCalloutSpec = {
      kind: "stat-callout",
      label: "Hours Saved",
      value: "5,500 h",
      caption: "should not render",
      secondary_metric: { label: "FTE Equivalent", value: "3.1 FTE" },
    };
    render(<StatCallout spec={spec} />);
    expect(screen.queryByText("should not render")).toBeNull();
    expect(screen.getByText("FTE Equivalent")).toBeTruthy();
  });

  it("renders the headline value in brand blue when value_color is 'brand'", () => {
    render(
      <StatCallout spec={{ kind: "stat-callout", label: "Hours Saved", value: "5,500 h", value_color: "brand" }} />,
    );
    expect(screen.getByText("5,500 h").className).toContain("text-[#264aff]");
  });

  it("renders the headline value in default ink when value_color is absent", () => {
    render(<StatCallout spec={{ kind: "stat-callout", label: "Hours Saved", value: "5,500 h" }} />);
    expect(screen.getByText("5,500 h").className).not.toContain("text-[#264aff]");
  });
});
