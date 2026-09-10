/**
 * OverlayPanel — slide-out detail panel anchored to the right edge of the
 * AssetViewer. Matches the canonical Celonis `board-overlay` pattern: the
 * overview stays visible behind, a resize drag handle sits on the left edge
 * of the panel, and an X button in the top-right closes the panel.
 *
 * Width is controlled by local React state (drag with the left-edge handle).
 * Open/close state is URL-driven via the `?detail=<slug>` query param so
 * deep-linking and back-button work naturally.
 *
 * Component content: renders BoardView for the target ScreenInstance. The
 * panel itself supplies the title bar + close button; the inner view's
 * `title` is shown there. Inner view's BoardView renders without its own
 * AssetViewer chrome.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ScreenInstance } from "@/types/screen-instance";
import { BoardView } from "./BoardView";
import { CelonisLoader } from "@/components/CelonisLoader";
import { usePrepMode } from "@/contexts/PrepModeContext";
import { cn } from "@/lib/utils";

/** Width reserved on the right edge by the TalktrackPanel when prep mode is on. */
const PREP_PANEL_WIDTH = 380;

export interface OverlayPanelProps {
  data: ScreenInstance;
  /** Called when the user clicks the X close button. The parent removes the
   *  `?detail=<slug>` query param to unmount this overlay. */
  onClose: () => void;
}

const DEFAULT_VIEWPORT_FRACTION = 2 / 3;
const MIN_WIDTH = 480;
const MAX_VIEWPORT_FRACTION = 0.92;

export function OverlayPanel({ data, onClose }: OverlayPanelProps) {
  const { prepMode } = usePrepMode();
  const rightOffset = prepMode ? PREP_PANEL_WIDTH : 0;
  const availableWidth = () => window.innerWidth - rightOffset;
  const [width, setWidth] = useState<number>(() => {
    const max = availableWidth() * MAX_VIEWPORT_FRACTION;
    const target = availableWidth() * DEFAULT_VIEWPORT_FRACTION;
    return Math.max(MIN_WIDTH, Math.min(target, max));
  });
  const draggingRef = useRef(false);
  // Slide-in animation: start off-screen at translate-x-full, flip to
  // translate-x-0 after the first paint so the CSS transition fires.
  // Matches the IconSidebar's `transition-all duration-300 ease-in-out`.
  const [shown, setShown] = useState(false);
  // Body loader: show the Celonis loading animation centered in the panel
  // body for ~450ms after the panel opens, then reveal the BoardView. The
  // underlying overview stays mounted and visible the entire time — no
  // page-level loader fires because the route pathname didn't change.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    const t = setTimeout(() => setLoading(false), 450);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, []);

  // Cap width to available space on resize OR when prep mode toggles (since
  // the prep panel reserves 380px on the right and the overlay must not slip
  // behind it).
  useEffect(() => {
    const clamp = () => {
      const max = availableWidth() * MAX_VIEWPORT_FRACTION;
      setWidth((w) => Math.min(w, max));
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepMode]);

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Drag-to-resize from the left edge. New width = right-edge of viewport
  // minus the mouse X position, clamped to [MIN_WIDTH, viewport × fraction].
  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const max = availableWidth() * MAX_VIEWPORT_FRACTION;
    const next = Math.max(
      MIN_WIDTH,
      Math.min(max, window.innerWidth - rightOffset - e.clientX),
    );
    setWidth(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightOffset]);

  const onDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* releasePointerCapture can throw if the pointer wasn't captured */
    }
  }, []);

  return (
    <>
      {/* No backdrop dim — the underlying overview stays fully visible and
       *  interactive (within the limits of the panel obscuring its right
       *  side). Close via the X button or Esc. */}

      {/* Panel itself. Anchored to the right; width is state-driven; slides
       *  in via translate-x transition on mount. */}
      <aside
        role="dialog"
        aria-label={data.title}
        // Panel is `fixed` to the viewport, not absolute to BoardPage —
        // matches the canonical Celonis `board-overlay` which spans the
        // entire page vertically (over the breadcrumb bar, content header,
        // everything except the left IconSidebar when the width permits).
        // z-[60] keeps it above the IconSidebar (z-50) if the user drags
        // the panel wide enough to overlap.
        className={cn(
          "fixed top-0 h-screen bg-white shadow-xl z-[60] flex flex-row",
          "transition-[transform,right] duration-500 ease-in-out",
          shown ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width, right: rightOffset }}
      >
        {/* Drag handle (left edge). Matches the canonical Celonis
         *  `board-overlay__resize` element: full-height white rail with a
         *  subtle left-direction shadow giving it visible depth against the
         *  overview, and a vertically-centered 2×4 dotted grip handle (the
         *  canonical drag-handle-vertical.svg pattern). */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          className="w-3.5 flex-shrink-0 cursor-col-resize bg-white relative group border-l border-r border-[#d3d3dd] shadow-[-2px_0_4px_rgba(10,31,68,0.05)]"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <svg
            width="8"
            height="16"
            viewBox="0 0 8 16"
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[#606582] group-hover:text-[#264aff] transition-colors"
            fill="currentColor"
          >
            <circle cx="2" cy="2" r="1" />
            <circle cx="6" cy="2" r="1" />
            <circle cx="2" cy="6" r="1" />
            <circle cx="6" cy="6" r="1" />
            <circle cx="2" cy="10" r="1" />
            <circle cx="6" cy="10" r="1" />
            <circle cx="2" cy="14" r="1" />
            <circle cx="6" cy="14" r="1" />
          </svg>
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Panel header — title + X close. Mirrors the AssetViewer's
           *  ContentHeader so the panel reads as a sibling chrome. */}
          <div className="flex items-center justify-between pl-5 pr-3 py-3 border-b border-[#d3d3dd] bg-white flex-shrink-0">
            <h2 className="text-xl font-bold text-foreground tracking-tight truncate">
              {data.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — Celonis loader centered while the view "loads", then the
           *  target view's BoardView. The underlying overview never reloads;
           *  this loader is purely the panel's perceived-fetch affordance.
           *  Body scrolls vertically when BoardView content exceeds the
           *  available panel height. */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <CelonisLoader size="lg" />
              </div>
            ) : (
              <BoardView data={data} />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
