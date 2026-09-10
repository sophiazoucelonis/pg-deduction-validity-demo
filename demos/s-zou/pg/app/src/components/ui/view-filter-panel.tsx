import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterDropdownPopover } from "@/components/ui/filter-dropdown-popover";

interface FilterToggleOption {
  id: string;
  label: string;
  active?: boolean;
}

interface FilterDropdown {
  id: string;
  label: string;
  placeholder?: string;
  options: { value: string; label: string; count?: number | string }[];
  group?: string;
}

interface DateRangePreset {
  id: string;
  label: string;
}

interface ViewFilterPanelProps {
  title?: string;
  toggleFilters?: {
    label: string;
    options: FilterToggleOption[];
  };
  dateFilter?: {
    label: string;
    presets: DateRangePreset[];
  };
  dropdownFilters?: FilterDropdown[];
  dropdownFilterGroups?: {
    id: string;
    label: string;
    filters: FilterDropdown[];
  }[];
  onClose?: () => void;
  className?: string;
}

export function ViewFilterPanel({
  title = "Filter Dimensions",
  toggleFilters,
  dateFilter,
  dropdownFilters,
  dropdownFilterGroups,
  onClose,
  className,
}: ViewFilterPanelProps) {
  const [activeToggles, setActiveToggles] = useState<Set<string>>(
    new Set(toggleFilters?.options.filter(o => o.active).map(o => o.id) || [])
  );
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setActiveToggles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn(
      "w-72 bg-card border-l border-border h-full flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter the data by various dimensions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Toggle filters */}
        {toggleFilters && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              {toggleFilters.label}
            </label>
            <div className="flex flex-col gap-2">
              {toggleFilters.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleToggle(option.id)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md border transition-colors text-left",
                    activeToggles.has(option.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date filter */}
        {dateFilter && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              {dateFilter.label}
            </label>
            {/* Date input field */}
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Select date range" 
                className="w-full h-10 pr-10 bg-card border-border"
                readOnly
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {/* Date presets */}
            <div className="flex flex-wrap gap-2">
              {dateFilter.presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveDatePreset(preset.id)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md border transition-colors",
                    activeDatePreset === preset.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dropdown filters */}
        {dropdownFilters && dropdownFilters.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Filter by Dimension
            </label>
            <div className="space-y-2">
              {dropdownFilters.map((filter) => (
                <FilterDropdownPopover
                  key={filter.id}
                  label={filter.label}
                  placeholder={filter.placeholder}
                  options={filter.options}
                />
              ))}
            </div>
          </div>
        )}

        {/* Grouped dropdown filters */}
        {dropdownFilterGroups && dropdownFilterGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              {group.label}
            </label>
            <div className="space-y-2">
              {group.filters.map((filter) => (
                <FilterDropdownPopover
                  key={filter.id}
                  label={filter.label}
                  placeholder={filter.placeholder}
                  options={filter.options}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
