import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { List, Pencil, X } from "lucide-react";

interface OEToolbarProps {
  flowName: string;
  isActive?: boolean;
  isEditMode?: boolean;
  onActiveChange?: (active: boolean) => void;
  onLogs?: () => void;
  onEdit?: () => void;
  onExitEdit?: () => void;
  className?: string;
}

export function OEToolbar({
  flowName,
  isActive = false,
  isEditMode = false,
  onActiveChange,
  onLogs,
  onEdit,
  onExitEdit,
  className,
}: OEToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 h-14 bg-card border-b border-border",
        className
      )}
    >
      {/* Left - Flow name */}
      <h2 className="font-semibold text-lg">{flowName}</h2>

      {/* Right - Controls */}
      <div className="flex items-center gap-3">
        {isEditMode ? (
          <>
            {/* Edit mode - Show Edit/Test buttons */}
            <Button variant="outline" size="sm" onClick={onEdit} className="hover:bg-muted hover:text-muted-foreground">
              Edit
            </Button>
            <Button variant="outline" size="sm" className="hover:bg-muted hover:text-muted-foreground">
              Test
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={onExitEdit}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            {/* View mode - Show Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={onActiveChange}
              />
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-success" : "text-muted-foreground"
              )}>
                Active
              </span>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Logs button */}
            <Button variant="outline" size="sm" onClick={onLogs}>
              <List className="w-4 h-4 mr-1.5" />
              Logs
            </Button>

            {/* Edit button */}
            <Button variant="default" size="icon" className="rounded-lg" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
