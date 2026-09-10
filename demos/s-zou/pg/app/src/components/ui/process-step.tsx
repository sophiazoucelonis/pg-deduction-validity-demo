import { cn } from "@/lib/utils";
import { Zap, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type StepStatus = "completed" | "active" | "pending" | "warning";

interface ProcessStepProps {
  title: string;
  subtitle?: string;
  status?: StepStatus;
  icon?: React.ReactNode;
  isLast?: boolean;
  className?: string;
}

const statusStyles: Record<StepStatus, { bg: string; icon: React.ElementType; iconColor: string }> = {
  completed: { bg: "bg-success/10", icon: CheckCircle2, iconColor: "text-success" },
  active: { bg: "bg-accent/10", icon: Zap, iconColor: "text-accent" },
  pending: { bg: "bg-muted", icon: Clock, iconColor: "text-muted-foreground" },
  warning: { bg: "bg-warning/10", icon: AlertTriangle, iconColor: "text-warning" },
};

export function ProcessStep({
  title,
  subtitle,
  status = "pending",
  icon,
  isLast = false,
  className,
}: ProcessStepProps) {
  const { bg, icon: StatusIcon, iconColor } = statusStyles[status];

  return (
    <div className={cn("relative", className)}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-1/2 top-full w-px h-8 bg-border -translate-x-1/2" />
      )}

      {/* Step card */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card shadow-card transition-all hover:shadow-md",
        status === "active" && "ring-2 ring-accent/20"
      )}>
        {/* Status indicator */}
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", bg)}>
          {icon || <StatusIcon className={cn("w-4 h-4", iconColor)} />}
        </div>

        {/* Content */}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{subtitle || "Process step"}</p>
          <p className="text-sm font-medium truncate">{title}</p>
        </div>
      </div>
    </div>
  );
}

interface ProcessFlowProps {
  steps: Array<{
    id: string;
    title: string;
    subtitle?: string;
    status?: StepStatus;
  }>;
  className?: string;
}

export function ProcessFlow({ steps, className }: ProcessFlowProps) {
  return (
    <div className={cn("flex flex-col items-center gap-8 py-6", className)}>
      {steps.map((step, index) => (
        <ProcessStep
          key={step.id}
          title={step.title}
          subtitle={step.subtitle}
          status={step.status}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
