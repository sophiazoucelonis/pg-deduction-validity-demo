import { describe, it, expect } from "vitest";
import { resolveActiveHotspots } from "./BoardPage";
import type { ScreenInstance } from "@/types/screen-instance";

// Regression guard: when an OverlayPanel is open, PrepOverlay must never
// fall back to the underlying screen's hotspots. Those hotspots target
// elements now hidden behind the panel — rendering their glow (a
// document.body portal at the same z-[60] as the panel, mounted after it)
// paints on TOP of the open overlay instead of staying hidden behind it.

const underlyingHotspots: ScreenInstance["hotspots"] = [
  { selector: "[data-prep-id='row-Production Planning Agent']", label: "Open the overlay", order: 1 },
];

const overlayScreenWithHotspots = {
  hotspots: [{ selector: "[data-prep-id='tab-details']", label: "Switch to Details", order: 1 }],
} as ScreenInstance;

const overlayScreenWithoutHotspots = {} as ScreenInstance;

describe("resolveActiveHotspots", () => {
  it("uses the underlying screen's hotspots when no overlay is open", () => {
    expect(resolveActiveHotspots(underlyingHotspots, undefined)).toBe(underlyingHotspots);
  });

  it("uses the overlay's own hotspots when the overlay is open and has some", () => {
    expect(resolveActiveHotspots(underlyingHotspots, overlayScreenWithHotspots)).toBe(
      overlayScreenWithHotspots.hotspots,
    );
  });

  it("returns undefined (no hotspots) when the overlay is open but declares none — never falls back to the underlying screen's", () => {
    expect(resolveActiveHotspots(underlyingHotspots, overlayScreenWithoutHotspots)).toBeUndefined();
  });
});
