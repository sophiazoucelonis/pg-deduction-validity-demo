import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  subtitle?: string;
  className?: string;
}

export function KpiCard({ label, value, trend, subtitle, className }: KpiCardProps) {
  const TrendIcon = trend?.direction === "up" 
    ? TrendingUp 
    : trend?.direction === "down" 
      ? TrendingDown 
      : Minus;

  const trendColor = trend?.direction === "up"
    ? "text-success"
    : trend?.direction === "down"
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className={cn(
      "p-4 bg-card rounded-lg border border-border",
      className
    )}>
      <p className="kpi-label mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <span className="kpi-value">{value}</span>
        {trend && (
          <div className={cn("flex items-center gap-1 text-sm font-medium pb-1", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
