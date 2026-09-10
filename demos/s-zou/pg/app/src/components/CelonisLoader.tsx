/**
 * CelonisLoader — pixel-replica of the real Celonis loading animation.
 *
 * The 4 stacked SVG paths trace the same outline at staggered
 * stroke-dashoffsets, producing a "C" that fills in smoothly. Path 1 is
 * static (the underlying outline); paths 2/3/4 animate their dashoffset
 * to give the illusion of strokes drawing across the C.
 *
 * Used:
 *  - As a full-screen overlay on initial app boot (before React hydrates,
 *    rendered directly in index.html via inline SVG/CSS for zero-flash).
 *  - As a brief full-screen overlay on every route navigation, so swapping
 *    between Control Tower and Process Explorer feels like a real product
 *    fetching a new view rather than an instant client-side route change.
 */

import { cn } from "@/lib/utils";

export type CelonisLoaderSize = "sm" | "md" | "lg";

interface CelonisLoaderProps {
  size?: CelonisLoaderSize;
  className?: string;
}

export function CelonisLoader({ size = "md", className }: CelonisLoaderProps) {
  return (
    <div
      className={cn(
        "ce-loading",
        size === "sm" && "ce-loading--sm",
        size === "md" && "ce-loading--md",
        size === "lg" && "ce-loading--lg",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox="0 0 25 26"
        className="ce-loading__svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd"
          strokeLinecap="round"
          strokeLinejoin="round"
          shapeRendering="geometricPrecision"
        >
          <path
            strokeWidth="2"
            d="M8.03874092,7.01517241 C4.04874092,9.82758621 1,10.1158621 1,14.8386207 C1,20.5296552 5.73389831,24.9075862 12.3489346,24.9075862 C18.8356174,24.9075862 23.6882082,19.6455172 23.702553,13.5641379 C23.7227119,7.67034483 19.6926877,1 14.8373366,1 C9.96887368,1 12.0180239,4.2103127 8.03874092,7.01517241 Z"
            className="ce-loading__path-1"
          />
          <path
            strokeWidth="2"
            d="M8.03874092,7.01517241 C4.04874092,9.82758621 1,10.1158621 1,14.8386207 C1,20.5296552 5.73389831,24.9075862 12.3489346,24.9075862 C18.8356174,24.9075862 23.6882082,19.6455172 23.7026283,13.5641379 C23.7227119,7.67034483 19.6926877,1 14.8373366,1 C14.8106184,1 14.7841086,1 14.7578051,1.00028947 C9.9992903,1.03516477 11.9893852,4.21486264 8.05888081,7.00093661"
            className="ce-loading__path-2"
          />
          <path
            strokeWidth="2"
            d="M8.03874092,7.01517241 C4.04874092,9.82758621 1,10.1158621 1,14.8386207 C1,20.5296552 5.73389831,24.9075862 12.3489346,24.9075862 C18.8356174,24.9075862 23.6882082,19.6455172 23.7026283,13.5641379 C23.7227119,7.67034483 19.6926877,1 14.8373366,1 C14.8106184,1 14.7841086,1 14.7578051,1.00028947 C9.9992903,1.03516477 11.9893852,4.21486264 8.05888081,7.00093661"
            className="ce-loading__path-3"
          />
          <path
            strokeWidth="2"
            d="M8.03874092,7.01517241 C4.04874092,9.82758621 1,10.1158621 1,14.8386207 C1,20.5296552 5.73389831,24.9075862 12.3489346,24.9075862 C18.8356174,24.9075862 23.6882082,19.6455172 23.7026283,13.5641379 C23.7227119,7.67034483 19.6926877,1 14.8373366,1 C14.8106184,1 14.7841086,1 14.7578051,1.00028947 C9.9992903,1.03516477 11.9893852,4.21486264 8.05888081,7.00093661"
            className="ce-loading__path-4"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Full-screen overlay variant, anchored to the viewport. Shown briefly on
 * route navigation and on initial app boot.
 */
export function CelonisLoaderOverlay({ size = "lg" }: { size?: CelonisLoaderSize }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <CelonisLoader size={size} />
    </div>
  );
}
