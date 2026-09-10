import { useEffect, useState } from "react";

/**
 * Measures a live pixel height and keeps it current across window resizes
 * and layout shifts that aren't a resize (e.g. an OverlayPanel's slide-in
 * transition finishing, prep-mode toggling). Re-measures via a
 * ResizeObserver on `document.documentElement`, which fires on window
 * resize without needing a manual listener, plus an explicit `resize`
 * listener as a belt-and-suspenders backstop.
 *
 * `measure` computes the raw pixel value (e.g. from
 * `window.innerHeight` and a ref's `getBoundingClientRect()`); the hook only
 * owns the observe/measure/floor lifecycle, not the formula — callers with
 * different anchors (a tab strip's bottom edge, a page's top offset) supply
 * their own `measure` function.
 */
export function useMeasuredHeight(measure: () => number, floor: number): number {
  const [height, setHeight] = useState(floor);

  useEffect(() => {
    const run = () => setHeight(Math.max(floor, measure()));
    run();
    window.addEventListener("resize", run);
    const ro = new ResizeObserver(run);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", run);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return height;
}
