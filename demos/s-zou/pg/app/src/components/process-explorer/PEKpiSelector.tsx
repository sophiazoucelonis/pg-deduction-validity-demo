import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type KpiType = "object-count" | "event-count" | "throughput-time";

export interface KpiOption {
  id: KpiType;
  label: string;
  /** Icon-glyph variant key, mapped to canonical Celonis SVG below. */
  icon: KpiIconKey;
  /** Tooltip-style description shown on the menu item (matches real Celonis). */
  description: string;
}

type KpiIconKey = "object-count" | "event-count" | "throughput-time";

/**
 * Canonical Celonis KPI icons. Pulled directly from the real product's
 * `<ce-icon data-testid="kpi-view-switcher-icon">` SVG paths so the trigger
 * button and menu items look identical to the real KPI selector.
 */
function KpiIcon({ kind, size = 22 }: { kind: KpiIconKey; size?: number }) {
  if (kind === "object-count") {
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
          d="M10.898 7.515a.75.75 0 0 1 .588.882l-.22 1.103h2.47l.28-1.397a.75.75 0 0 1 1.47.294l-.22 1.103h.984a.75.75 0 1 1 0 1.5h-1.285l-.4 2h1.185a.75.75 0 1 1 0 1.5h-1.485l-.28 1.398a.75.75 0 0 1-1.47-.295l.22-1.103h-2.47l-.28 1.398a.75.75 0 0 1-1.47-.295l.22-1.103H7.75a.75.75 0 1 1 0-1.5h1.286l.4-2H8.25a.75.75 0 1 1 0-1.5h1.486l.28-1.397a.75.75 0 0 1 .882-.588M10.565 13h2.47l.4-2h-2.47zM3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V6.25a1.75 1.75 0 0 0-1.75-1.75z"
        />
      </svg>
    );
  }
  if (kind === "event-count") {
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
          d="M11.314 3.527a.75.75 0 1 0-.12-1.495C6.049 2.442 2 6.748 2 12c0 5.523 4.477 10 10 10 5.249 0 9.553-4.044 9.967-9.186a.75.75 0 1 0-1.495-.12 8.5 8.5 0 1 1-9.158-9.167m6.383 1.147a.75.75 0 0 1 1.06-.046q.322.294.616.617a.75.75 0 0 1-1.105 1.013 9 9 0 0 0-.525-.525.75.75 0 0 1-.046-1.06M11.25 6a.75.75 0 0 1 .743.648L12 6.75V12h3.25a.75.75 0 0 1 .102 1.493l-.102.007h-4a.75.75 0 0 1-.743-.649l-.007-.101v-6a.75.75 0 0 1 .75-.75m2.531-3.11a.75.75 0 0 1 .925-.52 10 10 0 0 1 1.074.37.75.75 0 1 1-.567 1.388q-.444-.182-.912-.313a.75.75 0 0 1-.52-.925m7.478 5.325a.75.75 0 1 0-1.389.568 8 8 0 0 1 .315.915.75.75 0 1 0 1.444-.405 9.91 9.91 0 0 0-.37-1.078"
        />
      </svg>
    );
  }
  // throughput-time
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
        d="M7.934 16.066a.75.75 0 1 1-1.06 1.06 7.25 7.25 0 0 1 6.798-12.181.75.75 0 1 1-.344 1.46 5.75 5.75 0 0 0-5.393 9.661m9.954-6.924a.75.75 0 0 1 .955.46 7.25 7.25 0 0 1-1.716 7.525.75.75 0 1 1-1.061-1.061 5.75 5.75 0 0 0 1.362-5.969.75.75 0 0 1 .46-.955m-2.009-2.475a.625.625 0 0 1 .962.761l-.13.25a355 355 0 0 1-1.415 2.713 155 155 0 0 1-1.156 2.157c-.171.31-.326.586-.452.803a5 5 0 0 1-.32.5 1.875 1.875 0 0 1-2.94-2.327c.086-.109.244-.265.413-.425.182-.173.414-.387.678-.625a154 154 0 0 1 1.832-1.62 375 375 0 0 1 2.314-2.003zM22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0"
      />
    </svg>
  );
}

const kpiOptions: KpiOption[] = [
  {
    id: "object-count",
    label: "Object count",
    icon: "object-count",
    description: "The number of objects processed by events.",
  },
  {
    id: "event-count",
    label: "Event count",
    icon: "event-count",
    description: "The number of events processed by objects.",
  },
  {
    id: "throughput-time",
    label: "Throughput time",
    icon: "throughput-time",
    description: "The time it takes from one event to the next.",
  },
];

interface PEKpiSelectorProps {
  selectedKpi: KpiType;
  onSelectKpi: (kpi: KpiType) => void;
  className?: string;
}

export function PEKpiSelector({
  selectedKpi,
  onSelectKpi,
  className,
}: PEKpiSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentKpi = kpiOptions.find((k) => k.id === selectedKpi) ?? kpiOptions[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("ce-button-secondary ce-button-secondary--icon", className)}
          data-state={isOpen ? "open" : "closed"}
          aria-label={`Select KPI view to be displayed. Currently ${currentKpi.label} selected.`}
          title={currentKpi.label}
        >
          <KpiIcon kind={currentKpi.icon} size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-0 shadow-none bg-transparent"
        align="start"
        side="bottom"
        sideOffset={4}
        style={{ minWidth: 240 }}
      >
        <div className="ce-menu-panel" style={{ minWidth: 240 }}>
          <div role="menu">
            {kpiOptions.map((option) => {
              const isSelected = selectedKpi === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelectKpi(option.id);
                    setIsOpen(false);
                  }}
                  title={option.description}
                  aria-label={option.label}
                  className={cn("ce-menu-item", isSelected && "ce-selected")}
                >
                  <KpiIcon kind={option.icon} size={20} />
                  <span className="flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Export utility to check if KPI is time-based
export function isTimeKpi(kpiType: KpiType): boolean {
  return kpiType === "throughput-time";
}

// Back-compat icon getter (still imported elsewhere in case)
export function getKpiIcon(kpiType: KpiType): React.ReactNode {
  const kpi = kpiOptions.find((k) => k.id === kpiType) ?? kpiOptions[0];
  return <KpiIcon kind={kpi.icon} />;
}
