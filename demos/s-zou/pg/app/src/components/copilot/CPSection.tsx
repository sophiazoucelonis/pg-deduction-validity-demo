import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
interface CPSectionProps {
  title: string;
  description?: string;
  status?: "complete" | "incomplete";
  sectionNumber?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}
export function CPSection({
  title,
  description,
  status = "incomplete",
  sectionNumber,
  defaultExpanded = false,
  children,
  className
}: CPSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  return <div className={cn("bg-card border border-border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", status === "complete" && "bg-primary text-primary-foreground", status === "incomplete" && "bg-muted")}>
            {status === "complete" && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            {sectionNumber !== undefined && status !== "complete" && <span className="text-xs font-semibold">{sectionNumber}</span>}
            {status === "incomplete"}
          </div>

          {/* Title and description */}
          <div className="text-left">
            <h3 className="font-semibold text-sm">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>}
          </div>
        </div>

        {/* Expand/collapse icon */}
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {/* Content */}
      {isExpanded && <div className="px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>}
    </div>;
}