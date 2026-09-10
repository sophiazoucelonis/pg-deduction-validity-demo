/**
 * PEDeviationSlider — vertical slider mounted to the right edge of the
 * Process Explorer canvas. Reveals deviations one tick at a time as the user
 * drags the handle down. Position 0 = none revealed; max = all revealed
 * including the spaghetti bundle.
 *
 * Two of these stack on the right edge: the top one drives event deviations
 * (with the branch-fork icon), the bottom one drives connection deviations.
 * A small "jump to spaghetti" button (download-with-dot icon) sits between
 * them and instantly maxes out both sliders.
 */

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PEDeviationSliderProps {
  /** "events" | "connections" — controls header icon + counter label. */
  kind: "events" | "connections";
  /** Process / lane name shown in the counter pill, e.g. "Delivery Activity". */
  scopeLabel: string;
  /** Current slider value: 0..max. */
  value: number;
  /** Total ticks (= length of the deviation array, including spaghetti). */
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

const TRACK_HEIGHT = 200;

export function PEDeviationSlider({
  kind,
  scopeLabel,
  value,
  max,
  onChange,
  className,
}: PEDeviationSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);

  // Pillar progresses bottom→top: value=0 (happy path) sits at the BOTTOM,
  // value=max (all deviations revealed) at the TOP. Drag up = reveal more.
  const handleY = max === 0 ? 0 : ((max - value) / max) * TRACK_HEIGHT;

  // Faked higher denominator for the counter pill — real Celonis says e.g.
  // "9 of 15" even when there are far fewer deviations actually authored.
  // Multiplier is a stable function of `max` so the number doesn't jitter
  // as the user drags.
  const fakeDenominator = useMemo(() => {
    if (max === 0) return 0;
    return max * 4 - 1; // e.g. 4 ticks → "of 15"
  }, [max]);
  const fakeNumerator = useMemo(() => {
    if (max === 0) return 0;
    // Distribute the visible ticks across the fake denominator so each tick
    // looks like a meaningful jump (1→4, 2→8, 3→12, 4→15).
    return Math.round((value / max) * fakeDenominator);
  }, [value, max, fakeDenominator]);

  const valueFromClientY = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const local = Math.max(0, Math.min(rect.height, clientY - rect.top));
    // Bottom = value 0, top = value max — invert the linear mapping.
    return Math.round(((rect.height - local) / rect.height) * max);
  };

  // When the demo has no deviations authored for this slider's category,
  // the widget renders for chrome consistency but pointer interaction is
  // a no-op so the user can't drag past 0.
  const isDisabled = max === 0;

  const onPointerDown = (e: React.PointerEvent) => {
    if (isDisabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setInteracting(true);
    onChange(valueFromClientY(e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDisabled || !interacting) return;
    onChange(valueFromClientY(e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isDisabled) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setInteracting(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-border bg-white px-1.5 py-2 shadow-sm",
        isDisabled && "opacity-50",
        className,
      )}
    >
      {/* Header icon */}
      <div className="text-foreground">
        {kind === "events" ? <BranchForkIcon /> : <EventCardIcon />}
      </div>

      {/* +/- end-stops. + sits at the top (drag up = reveal more), - at bottom. */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onChange(Math.min(max, value + 1))}
        className="text-xs leading-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        aria-label="Reveal more"
      >
        +
      </button>

      {/* Track + handle */}
      <div className="relative" style={{ height: TRACK_HEIGHT, width: 18 }}>
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 cursor-pointer bg-border"
          style={{ touchAction: "none" }}
        />
        {/* Filled portion (active range) — anchored at the BOTTOM and
         *  growing upward as the user reveals more deviations. At value=0
         *  the fill is empty; at value=max the fill spans the full track. */}
        <div
          className="absolute left-1/2 bottom-0 w-px -translate-x-1/2 bg-foreground"
          style={{ height: TRACK_HEIGHT - handleY, pointerEvents: "none" }}
        />
        {/* Handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "absolute left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-border bg-white shadow",
            interacting && "cursor-grabbing",
          )}
          style={{ top: handleY, touchAction: "none" }}
        />

        {/* Counter pill — shown while dragging or when value > 0 */}
        {(interacting || value > 0) && (
          <div
            className="absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{ pointerEvents: "none" }}
          >
            <div className="flex items-center gap-1.5">
              <DownArrowDotIcon className="text-foreground" size={12} />
              <span className="font-medium text-foreground">
                {scopeLabel} {kind}
              </span>
              <span className="text-sidebar-active-foreground">
                {fakeNumerator} of {fakeDenominator}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onChange(Math.max(0, value - 1))}
        className="text-xs leading-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        aria-label="Reveal fewer"
      >
        −
      </button>
    </div>
  );
}

/**
 * SpaghettiJumpButton — sits between the two sliders. Clicking maxes out
 * both. Uses the canonical Celonis download-with-dot icon.
 */
export function SpaghettiJumpButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Show all deviations (spaghetti)"
      aria-label="Show all deviations"
      className={cn(
        "flex size-7 items-center justify-center rounded-md border border-border bg-white text-foreground shadow-sm hover:bg-muted",
        className,
      )}
    >
      <DownArrowDotIcon size={16} />
    </button>
  );
}

// ----- Icons (per real Celonis SVGs) -----

function BranchForkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M11 5.5a3.5 3.5 0 0 1-3 3.465V11.5h6.25a2.25 2.25 0 0 0 2.25-2.25v-.395A3.502 3.502 0 0 1 17.5 2a3.5 3.5 0 0 1 .5 6.965v.285A3.75 3.75 0 0 1 14.25 13H8v2.035a3.5 3.5 0 1 1-1.5.11v-6.29A3.502 3.502 0 0 1 7.5 2 3.5 3.5 0 0 1 11 5.5m-3.5 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4m-8 11a2 2 0 1 0-4 0 2 2 0 0 0 4 0"
      />
    </svg>
  );
}

function EventCardIcon({ size = 18 }: { size?: number }) {
  // Connection-deviation slider header: simple rectangle (event-card glyph),
  // matches the visual mark Celonis uses on the connections slider in 02–05.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="8"
        width="16"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function DownArrowDotIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        d="M12 2a.75.75 0 0 1 .75.75v9.256l3.484-3.3a.75.75 0 1 1 1.032 1.088l-4.75 4.5a.75.75 0 0 1-1.032 0l-4.75-4.5a.75.75 0 0 1 1.032-1.088l3.484 3.3V2.75A.75.75 0 0 1 12 2m0 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0-1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"
      />
    </svg>
  );
}
