import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Save,
  FileInput,
  Settings,
  LayoutGrid,
  Play,
  KeyRound,
  ChevronDown,
  Pencil,
  X,
} from "lucide-react";

interface FlowToolbarProps {
  flowName: string;
  flowKey?: string;
  onEdit?: () => void;
  onClose?: () => void;
  onExitEdit?: () => void;
  onRun?: () => void;
  isEditMode?: boolean;
  className?: string;
}

export function FlowToolbar({
  flowName,
  flowKey,
  onEdit,
  onClose,
  onExitEdit,
  onRun,
  isEditMode = false,
  className,
}: FlowToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 h-14 bg-card border-b border-border",
        className
      )}
    >
      {/* Left section - Flow identity */}
      <div className="flex items-center gap-3">
        {/* Play button */}
        <button
          onClick={onRun}
          className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors"
        >
          <Play className="w-4 h-4 text-background fill-current" />
        </button>

        {/* Flow name */}
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{flowName}</h2>
          {flowKey && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{flowKey}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center section - Simplified Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-muted-foreground">
          <Save className="w-4 h-4 mr-1.5" />
          Save
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-muted-foreground">
          <FileInput className="w-4 h-4 mr-1.5" />
          Inputs
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-muted-foreground">
          <Settings className="w-4 h-4 mr-1.5" />
          Settings
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-muted-foreground">
          <LayoutGrid className="w-4 h-4 mr-1.5" />
          Blueprint
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Right section - Edit/Close */}
      <div className="flex items-center gap-2">
        <Button 
          variant={isEditMode ? "default" : "outline"} 
          size="sm" 
          onClick={onEdit}
          className={isEditMode ? "bg-primary hover:bg-primary/90" : "hover:bg-muted hover:text-muted-foreground"}
        >
          <Pencil className="w-4 h-4 mr-1.5" />
          {isEditMode ? "Editing" : "Edit"}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-muted" 
          onClick={isEditMode ? onExitEdit : onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
