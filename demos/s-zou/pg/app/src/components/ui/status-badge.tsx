import { cn } from "@/lib/utils";
import { Check, AlertCircle, Clock, X } from "lucide-react";

type BadgeVariant = "deployed" | "success" | "warning" | "error" | "pending" | "info" | "neutral";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  deployed: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  neutral: "bg-secondary text-secondary-foreground",
};

const variantIcons: Record<BadgeVariant, React.ElementType> = {
  deployed: Check,
  success: Check,
  warning: AlertCircle,
  error: X,
  pending: Clock,
  info: AlertCircle,
  neutral: Clock,
};

export function StatusBadge({ variant, children, showIcon = false, className }: StatusBadgeProps) {
  const Icon = variantIcons[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
