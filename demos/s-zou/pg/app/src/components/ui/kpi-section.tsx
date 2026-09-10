import { cn } from "@/lib/utils";
import { Info, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KpiItem {
  label: string;
  value: string | number;
  tooltip?: string;
}

interface KpiSectionProps {
  title: string;
  kpis: KpiItem[];
  className?: string;
}

export function KpiSection({ title, kpis, className }: KpiSectionProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border",
      className
    )}>
      {/* Section header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Key metrics for {title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPI grid */}
      <div className="flex items-stretch overflow-x-auto">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 min-w-[140px] px-5 py-4",
              index !== kpis.length - 1 && "border-r border-border"
            )}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </span>
              {kpi.tooltip && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{kpi.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {kpi.value}
            </span>
          </div>
        ))}

        {/* Scroll indicator */}
        <div className="flex items-center px-2 text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
