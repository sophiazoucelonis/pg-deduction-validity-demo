import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HotspotProps {
  selector: string;
  label: string;
  order: number;
}

const BRAND = "var(--brand-primary, #264aff)";

export function Hotspot({ selector, label, order }: HotspotProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let onWin: (() => void) | null = null;

    const attach = (anchor: HTMLElement) => {
      const measure = () => {
        if (cancelled) return;
        const r = anchor.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      };
      measure();
      onWin = measure;
      window.addEventListener("scroll", onWin, true);
      window.addEventListener("resize", onWin);
      // Browser page-zoom (Cmd+/Cmd-, pinch-zoom) doesn't reliably re-fire a
      // ResizeObserver or `resize` event on zoom-IN specifically — Chromium
      // sometimes coalesces/drops that callback, leaving `rect` stale and
      // too-wide for the now-smaller CSS-px anchor, so the glow box overflows
      // past the card's right edge into whatever sits next to it (reported:
      // the Deployed AI Solutions row's glow overflowing into the bar chart).
      // `visualViewport`'s `resize` event is purpose-built to fire on every
      // zoom change in both directions and doesn't have this gap.
      window.visualViewport?.addEventListener("resize", onWin);
      observer = new ResizeObserver(measure);
      observer.observe(anchor);
      observer.observe(document.body);
    };

    // Retry until the anchor mounts (overlay panel + loaders mount after the
    // route changes, so the selector may resolve to nothing for the first
    // ~500ms). Bail after 5s and warn in dev.
    const deadline = Date.now() + 5000;
    const tryFind = () => {
      if (cancelled) return;
      const anchor = document.querySelector(selector) as HTMLElement | null;
      if (anchor) {
        attach(anchor);
        return;
      }
      if (Date.now() > deadline) {
        if (import.meta.env.DEV) {
          console.warn(
            `[prep-mode] Hotspot selector resolved to nothing after 5s: ${selector}`,
          );
        }
        return;
      }
      requestAnimationFrame(tryFind);
    };
    tryFind();

    return () => {
      cancelled = true;
      if (onWin) {
        window.removeEventListener("scroll", onWin, true);
        window.removeEventListener("resize", onWin);
        window.visualViewport?.removeEventListener("resize", onWin);
      }
      if (observer) observer.disconnect();
    };
  }, [selector]);

  if (!rect) return null;

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-[60]"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
      title={label}
    >
      {/* Pulsing glow ring — opacity pulses via Tailwind `animate-pulse`, the
          ring shape itself is a multi-stop box-shadow around the anchor. */}
      <span
        className="absolute inset-0 rounded-lg animate-pulse"
        style={{
          boxShadow: `0 0 0 2px ${BRAND}, 0 0 0 6px rgba(38, 74, 255, 0.25), 0 0 18px 4px rgba(38, 74, 255, 0.45)`,
        }}
      />
      {/* Order badge top-right — communicates step sequence at a glance. */}
      <span
        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
        style={{ backgroundColor: BRAND }}
      >
        {order}
      </span>
    </div>,
    document.body,
  );
}
