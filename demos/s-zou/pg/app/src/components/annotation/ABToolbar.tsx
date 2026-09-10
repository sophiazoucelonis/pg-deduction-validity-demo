import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { History, Play, Pencil } from "lucide-react";

interface ABToolbarProps {
  name: string;
  isDeployed?: boolean;
  onTestConfig?: () => void;
  onHistory?: () => void;
  onRun?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function ABToolbar({
  name,
  isDeployed = false,
  onTestConfig,
  onHistory,
  onRun,
  onEdit,
  className,
}: ABToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 bg-card border-b border-border",
        className
      )}
    >
      {/* Left - Name */}
      <h2 className="font-semibold text-lg">{name}</h2>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onTestConfig}
          className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
        >
          Test Configuration
        </Button>

        {isDeployed && (
          <StatusBadge variant="success" showIcon>
            Deployed
          </StatusBadge>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={onHistory}>
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={onRun}>
            <Play className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
