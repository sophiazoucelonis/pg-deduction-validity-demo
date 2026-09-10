// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComponentBoundary } from "./ComponentBoundary";

function Boom(): JSX.Element {
  throw new Error("kaboom");
}

describe("ComponentBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ComponentBoundary label="kpi-card">
        <div>healthy tile</div>
      </ComponentBoundary>,
    );
    expect(screen.getByText("healthy tile")).toBeTruthy();
  });

  it("degrades a throwing child to the default tile card (not a crash)", () => {
    // React logs the caught error to console.error; silence it for a clean run.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ComponentBoundary label="kpi-card">
        <Boom />
      </ComponentBoundary>,
    );
    // The card surfaces the failure + the label, and does NOT rethrow.
    expect(screen.getByText(/couldn’t be rendered/i)).toBeTruthy();
    expect(screen.getByText("kpi-card")).toBeTruthy();
  });

  it("uses a custom fallback (the per-screen net) when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ComponentBoundary
        label="screen:x"
        fallback={<div>screen net fallback</div>}
      >
        <Boom />
      </ComponentBoundary>,
    );
    expect(screen.getByText("screen net fallback")).toBeTruthy();
  });

  it("isolates the failure: a sibling boundary still renders its child", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <ComponentBoundary label="bad">
          <Boom />
        </ComponentBoundary>
        <ComponentBoundary label="good">
          <div>surviving tile</div>
        </ComponentBoundary>
      </div>,
    );
    // The point of per-tile wrapping: one bad tile does not take down the others.
    expect(screen.getByText("surviving tile")).toBeTruthy();
    expect(screen.getByText(/couldn’t be rendered/i)).toBeTruthy();
  });
});
