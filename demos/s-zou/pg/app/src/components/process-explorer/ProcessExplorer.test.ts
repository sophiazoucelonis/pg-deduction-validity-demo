import { describe, it, expect } from "vitest";
import { defaultVisibleLaneIds } from "./ProcessExplorer";

describe("defaultVisibleLaneIds", () => {
  it("shows only the focal lane when no agent lane is present", () => {
    const objects = [
      { id: "focal", is_focal: true },
      { id: "upstream-1" },
      { id: "upstream-2" },
    ];
    expect(defaultVisibleLaneIds(objects)).toEqual(new Set(["focal"]));
  });

  it("shows the focal lane AND the agent lane together", () => {
    const objects = [
      { id: "focal", is_focal: true },
      { id: "agent", is_agent: true },
      { id: "upstream-1" },
    ];
    expect(defaultVisibleLaneIds(objects)).toEqual(new Set(["focal", "agent"]));
  });

  it("does not duplicate the id if a lane is both focal and the agent", () => {
    const objects = [{ id: "focal-agent", is_focal: true, is_agent: true }, { id: "other" }];
    expect(defaultVisibleLaneIds(objects)).toEqual(new Set(["focal-agent"]));
  });

  it("falls back to the first two lanes when no object is flagged is_focal (legacy demos)", () => {
    const objects = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(defaultVisibleLaneIds(objects)).toEqual(new Set(["a", "b"]));
  });

  it("ignores is_agent when there is no focal lane (legacy fallback still wins)", () => {
    const objects = [{ id: "a" }, { id: "b", is_agent: true }, { id: "c" }];
    expect(defaultVisibleLaneIds(objects)).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty set when objects is undefined", () => {
    expect(defaultVisibleLaneIds(undefined)).toEqual(new Set());
  });
});
