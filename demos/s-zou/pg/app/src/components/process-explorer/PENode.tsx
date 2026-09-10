import { cn } from "@/lib/utils";

export type NodeType = "object" | "event-start" | "event-end" | "event-process";

interface PENodeProps {
  type: NodeType;
  label: string;
  count?: string;
  className?: string;
  style?: React.CSSProperties;
}

const nodeColors = {
  "object": {
    bg: "bg-pink-100",
    border: "border-pink-400",
    dot: "bg-pink-500",
  },
  "event-start": {
    bg: "bg-teal-500",
    border: "border-teal-600",
    dot: "bg-teal-500",
  },
  "event-end": {
    bg: "bg-pink-500",
    border: "border-pink-600",
    dot: "bg-pink-500",
  },
  "event-process": {
    bg: "bg-gray-400",
    border: "border-gray-500",
    dot: "bg-gray-400",
  },
};

export function PENode({ type, label, count, className, style }: PENodeProps) {
  const colors = nodeColors[type];

  if (type === "object") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm",
          colors.border,
          className
        )}
        style={style}
      >
        <div className={cn("w-3 h-3 rounded-full", colors.dot)} />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {count && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              {count} objects
            </span>
          )}
        </div>
      </div>
    );
  }

  // Event nodes (circles)
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      style={style}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2",
          colors.bg,
          colors.border
        )}
      />
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {count && (
          <span className="text-xs text-muted-foreground ml-2">{count} Times</span>
        )}
      </div>
    </div>
  );
}

interface PEEdgeProps {
  label?: string;
  vertical?: boolean;
  className?: string;
}

export function PEEdge({ label, vertical = true, className }: PEEdgeProps) {
  if (vertical) {
    return (
      <div className={cn("flex items-center gap-2 py-1", className)}>
        <div className="w-0.5 h-8 bg-gray-300 ml-[7px]" />
        {label && (
          <span className="text-xs text-muted-foreground bg-white px-1 -ml-6">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="h-0.5 w-12 bg-gray-300" />
      {label && (
        <span className="text-xs text-muted-foreground bg-white px-1 -ml-4">
          {label}
        </span>
      )}
    </div>
  );
}
