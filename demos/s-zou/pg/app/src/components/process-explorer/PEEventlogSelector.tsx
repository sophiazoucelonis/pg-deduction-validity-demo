/**
 * PEEventlogSelector — top-left chrome control for showing/hiding lanes.
 *
 * Trigger button shows up to 3 stacked coloured dots (the first 3 currently
 * visible lanes' colours). Clicking opens a popover menu listing the demo's
 * lanes; toggling a checkbox hides/shows that lane on the canvas.
 *
 * Min visible: 1. The last-checked option becomes read-only so the user
 * can't fully empty the canvas.
 *
 * Visual: ports the Celonis Element ce-menu-panel + ce-menu-item--option
 * styles, and the secondary-button trigger variant. See index.css for the
 * canonical classes.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface EventlogOption {
  id: string;
  label: string;
  /** Hex or CSS-var color string for the dot. */
  color: string;
  interactive: boolean;
}

interface PEEventlogSelectorProps {
  options: EventlogOption[];
  visibleLaneIds: Set<string>;
  onToggleLane: (laneId: string) => void;
  className?: string;
}

export function PEEventlogSelector({
  options,
  visibleLaneIds,
  onToggleLane,
  className,
}: PEEventlogSelectorProps) {
  const [open, setOpen] = useState(false);

  const sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));

  // Show ALL currently-visible lanes' colours as stacked dots (matches the real
  // product, where every selected event log appears). Capped at the 16-object
  // max the menu advertises.
  const visibleColors = options
    .filter((o) => visibleLaneIds.has(o.id))
    .map((o) => o.color)
    .slice(0, 16);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("ce-button-secondary", className)}
          style={{
            // Dynamic width — square (32×32) when 1 lane is selected, growing
            // by 7px per additional dot (the dot stack overlap step) so the
            // button just hugs its content. Animated via the same 0.1s
            // linear color/border transition.
            width: 32 + Math.max(0, visibleColors.length - 1) * 7,
            padding: 0,
            transition:
              "width 0.2s ease-out, color 0.1s linear, background-color 0.1s linear, border-color 0.1s linear",
          }}
          data-state={open ? "open" : "closed"}
          aria-label={`Select event logs to be displayed. Currently ${visibleColors.length} selected.`}
        >
          <span className="flex items-center" style={{ height: 14 }}>
            {visibleColors.map((color, i) => (
              <span
                key={i}
                className="rounded-full border-2 border-white"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: color,
                  marginLeft: i === 0 ? 0 : -7,
                  zIndex: i,
                }}
              />
            ))}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="ce-menu-panel p-0 border-0 shadow-none bg-transparent"
        align="start"
        side="bottom"
        sideOffset={4}
        style={{ minWidth: 240 }}
      >
        <div className="ce-menu-panel" style={{ minWidth: 240 }}>
          <div className="ce-menu-panel__header">
            Eventlogs
            <span className="ce-menu-panel__header__sub">(Max. 16 Objects)</span>
          </div>
          <div role="menu">
            {sortedOptions.map((opt) => {
              const isChecked = visibleLaneIds.has(opt.id);
              // Last-checked guard: when only one lane is visible and this
              // option is the one, lock it. Process Explorer needs at least
              // one event log on the canvas.
              const isLastVisible = isChecked && visibleLaneIds.size <= 1;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  disabled={isLastVisible}
                  onClick={() => !isLastVisible && onToggleLane(opt.id)}
                  className={cn("ce-menu-item", isChecked && "ce-selected")}
                  aria-checked={isChecked}
                  title={isLastVisible ? "At least one event log must be visible." : undefined}
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-sm border"
                    style={{
                      borderColor: isChecked ? "var(--ce-content-primary, #264aff)" : "var(--ce-border, #b5b6c6)",
                      backgroundColor: isChecked ? "var(--ce-content-primary, #264aff)" : "transparent",
                    }}
                  >
                    {isChecked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                  <span
                    className="rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: opt.color,
                      boxShadow: `0 0 0 1.5px ${opt.color}33, 0 0 0 2.5px white inset`,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
