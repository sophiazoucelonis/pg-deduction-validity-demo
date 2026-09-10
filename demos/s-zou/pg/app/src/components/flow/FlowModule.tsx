import { cn } from "@/lib/utils";
import { LucideIcon, Wrench } from "lucide-react";

export type ModuleVariant = "trigger" | "parser" | "tools" | "action" | "condition" | "output" | "sap";

interface FlowModuleProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string | number;
  variant?: ModuleVariant;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  isEditMode?: boolean;
  showLeftConnector?: boolean;
  showRightConnector?: boolean;
  nextVariant?: ModuleVariant;
  prevVariant?: ModuleVariant;
}

const variantStyles: Record<ModuleVariant, { bg: string; iconBg: string; color: string }> = {
  trigger: { 
    bg: "bg-chart-1/10", 
    iconBg: "bg-[#0078D4]",
    color: "#0078D4"
  },
  parser: { 
    bg: "bg-chart-4/10", 
    iconBg: "bg-[#f97316]",
    color: "#f97316"
  },
  tools: { 
    bg: "bg-chart-5/10", 
    iconBg: "bg-[#8b5cf6]",
    color: "#8b5cf6"
  },
  action: { 
    bg: "bg-chart-2/10", 
    iconBg: "bg-chart-2",
    color: "#22c55e"
  },
  condition: { 
    bg: "bg-chart-3/10", 
    iconBg: "bg-chart-3",
    color: "#eab308"
  },
  output: { 
    bg: "bg-accent/10", 
    iconBg: "bg-accent",
    color: "#6366f1"
  },
  sap: {
    bg: "bg-[#1B3A6D]/10",
    iconBg: "bg-[#1B3A6D]",
    color: "#1B3A6D"
  },
};

export function FlowModule({
  icon: Icon,
  title,
  subtitle,
  badge,
  variant = "action",
  className,
  onClick,
  isSelected = false,
  isEditMode = false,
  showLeftConnector = false,
  showRightConnector = false,
}: FlowModuleProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 cursor-pointer group relative",
        isEditMode && "relative",
        className
      )}
      onClick={onClick}
    >
      {/* Module container with bubbles */}
      <div className="relative flex items-center">
        {/* Circle Icon */}
        <div
          className={cn(
            "relative w-24 h-24 rounded-full flex items-center justify-center transition-all z-10",
            styles.iconBg,
            isSelected && "ring-4 ring-accent ring-offset-2 ring-offset-background",
            isEditMode && "group-hover:ring-2 group-hover:ring-primary/50"
          )}
        >
          <Icon className="w-10 h-10 text-white" />
          
          {/* Badge */}
          {badge !== undefined && (
            <span className="absolute -bottom-1 -right-1 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-card border-2 border-border rounded-md text-xs font-semibold">
              {badge}
            </span>
          )}
          
          {/* Left Connector Docker - only visible when connected */}
          {showLeftConnector && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[6px] w-3 h-8 rounded-l-full z-20"
              style={{ backgroundColor: styles.color, opacity: 0.6 }}
            />
          )}
          
          {/* Right Connector Docker - only visible when connected */}
          {showRightConnector && (
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[6px] w-3 h-8 rounded-r-full z-20"
              style={{ backgroundColor: styles.color, opacity: 0.6 }}
            />
          )}
          
          {/* Edit Mode Connection Points - show on hover for potential connections */}
          {isEditMode && !showLeftConnector && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-muted border-2 border-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
          )}
          {isEditMode && !showRightConnector && (
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-muted border-2 border-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
          )}
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

interface FlowConnectorProps {
  className?: string;
}

export function FlowConnector({ className }: FlowConnectorProps) {
  const stroke = "hsl(var(--muted-foreground))";

  return (
    <div
      className={cn(
        "flex items-center justify-center w-[60px] -mx-[10px] pointer-events-none z-10",
        className
      )}
    >
      {/* Dashed line that docks into connector bubbles */}
      <div className="flex items-center flex-shrink-0">
        <svg width="18" height="8" viewBox="0 0 18 8" fill="none" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke={stroke}
            strokeWidth="3"
            strokeOpacity="0.5"
            strokeDasharray="5 3"
          />
        </svg>

        <div className="w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center flex-shrink-0 shadow-sm">
          <Wrench className="w-2.5 h-2.5 text-muted-foreground" />
        </div>

        <svg width="18" height="8" viewBox="0 0 18 8" fill="none" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke={stroke}
            strokeWidth="3"
            strokeOpacity="0.5"
            strokeDasharray="5 3"
          />
        </svg>
      </div>
    </div>
  );
}
