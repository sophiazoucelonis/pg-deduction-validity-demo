import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Plus, Settings, Play, AlertTriangle, Pencil, Copy, Trash2 } from "lucide-react";
import { ModuleVariant } from "./FlowModule";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Position {
  x: number;
  y: number;
}

interface DraggableFlowModuleProps {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string | number;
  variant?: ModuleVariant;
  position: Position;
  onPositionChange: (id: string, position: Position) => void;
  onClick?: () => void;
  isSelected?: boolean;
  isEditMode?: boolean;
  // Positions of connected modules for docker direction
  incomingPosition?: Position | null;
  outgoingPosition?: Position | null;
  zoom?: number;
  // Connection drag handlers
  onConnectionDragStart?: (moduleId: string, side: "left" | "right") => void;
  onConnectionDragEnd?: (targetModuleId: string, side: "left" | "right") => void;
  isConnectionDragging?: boolean;
  connectionDragSource?: { moduleId: string; side: "left" | "right" } | null;
  // Delete handler
  onDelete?: (moduleId: string) => void;
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

// Offset to get center of circle (module position includes text below)
export const CIRCLE_CENTER_OFFSET = -26;

// Calculate angle from one position to another
function getAngle(from: Position, to: Position): number {
  const fromCircle = { x: from.x, y: from.y + CIRCLE_CENTER_OFFSET };
  const toCircle = { x: to.x, y: to.y + CIRCLE_CENTER_OFFSET };
  return Math.atan2(toCircle.y - fromCircle.y, toCircle.x - fromCircle.x) * (180 / Math.PI);
}

export function DraggableFlowModule({
  id,
  icon: Icon,
  title,
  subtitle,
  badge,
  variant = "action",
  position,
  onPositionChange,
  onClick,
  isSelected = false,
  isEditMode = false,
  incomingPosition = null,
  outgoingPosition = null,
  zoom = 100,
  onConnectionDragStart,
  onConnectionDragEnd,
  isConnectionDragging = false,
  connectionDragSource = null,
  onDelete,
}: DraggableFlowModuleProps) {
  const styles = variantStyles[variant];
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const mouseDownTimeRef = useRef<number>(0);
  const moduleRef = useRef<HTMLDivElement>(null);

  // Calculate docker angles based on connected module positions
  // Incoming docker points toward the source module (where connection comes from)
  const incomingAngle = incomingPosition ? getAngle(position, incomingPosition) : 180;
  // Outgoing docker points toward the target module (where connection goes to)
  const outgoingAngle = outgoingPosition ? getAngle(position, outgoingPosition) : 0;

  // Check if this module can receive a connection
  const canReceiveFromLeft = isConnectionDragging && connectionDragSource?.moduleId !== id && !incomingPosition;
  const canReceiveFromRight = isConnectionDragging && connectionDragSource?.moduleId !== id && !outgoingPosition;

  const handleConnectionPointMouseDown = (e: React.MouseEvent, side: "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();
    onConnectionDragStart?.(id, side);
  };

  const handleConnectionDrop = (side: "left" | "right") => {
    if (isConnectionDragging && connectionDragSource?.moduleId !== id) {
      onConnectionDragEnd?.(id, side);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode) return;
    
    e.stopPropagation();
    setIsDragging(true);
    setHasMoved(false);
    mouseDownTimeRef.current = Date.now();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [isEditMode, position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const moveDistance = Math.sqrt(dx * dx + dy * dy);
      
      if (moveDistance > 5) {
        setHasMoved(true);
      }
      
      const scale = zoom / 100;
      const scaledDx = dx / scale;
      const scaledDy = dy / scale;
      
      onPositionChange(id, {
        x: dragStartRef.current.posX + scaledDx,
        y: dragStartRef.current.posY + scaledDy,
      });
    };

    const handleMouseUp = () => {
      const wasQuickClick = Date.now() - mouseDownTimeRef.current < 200 && !hasMoved;
      
      setIsDragging(false);
      dragStartRef.current = null;
      
      if (wasQuickClick && onClick) {
        onClick();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, id, onPositionChange, zoom, hasMoved, onClick]);

  const moduleContent = (
    <div
      ref={moduleRef}
      className={cn(
        "absolute flex flex-col items-center gap-3 group",
        isEditMode && "cursor-grab",
        isDragging && "cursor-grabbing z-50",
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Module container */}
      <div className="relative flex items-center">
        {/* Circle Icon */}
        <div
          className={cn(
            "relative w-24 h-24 rounded-full flex items-center justify-center transition-all z-10",
            styles.iconBg,
            isSelected && "ring-4 ring-accent ring-offset-2 ring-offset-background",
            isEditMode && !isDragging && "group-hover:ring-2 group-hover:ring-primary/50"
          )}
        >
          <Icon className="w-10 h-10 text-white" />
          
          {/* Badge */}
          {badge !== undefined && (
            <span className="absolute -bottom-1 -right-1 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-card border-2 border-border rounded-md text-xs font-semibold">
              {badge}
            </span>
          )}
          
          {/* Incoming Connector Docker - rotates toward connected module */}
          {incomingPosition && (
            <div 
              className="absolute w-4 h-10 z-20"
              style={{ 
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${incomingAngle}deg) translateX(${MODULE_RADIUS + 4}px)`,
              }}
            >
              <div 
                className="w-4 h-10 rounded-full"
                style={{ backgroundColor: styles.color, opacity: 0.5 }}
              />
            </div>
          )}
          
          {/* Outgoing Connector Docker - rotates toward connected module */}
          {outgoingPosition && (
            <div 
              className="absolute w-4 h-10 z-20"
              style={{ 
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${outgoingAngle}deg) translateX(${MODULE_RADIUS + 4}px)`,
              }}
            >
              <div 
                className="w-4 h-10 rounded-full"
                style={{ backgroundColor: styles.color, opacity: 0.5 }}
              />
            </div>
          )}

          {/* Left Connection Point - show when no incoming connection in edit mode */}
          {isEditMode && !incomingPosition && (
            <div 
              className={cn(
                "absolute w-8 h-8 z-30 cursor-pointer transition-all",
                canReceiveFromLeft && "scale-125"
              )}
              style={{ 
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(180deg) translateX(${MODULE_RADIUS + 8}px)`,
              }}
              onMouseDown={(e) => handleConnectionPointMouseDown(e, "left")}
              onMouseUp={() => handleConnectionDrop("left")}
            >
              <div 
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all",
                  canReceiveFromLeft 
                    ? "border-primary bg-primary/20" 
                    : "border-muted-foreground/50 bg-background hover:border-primary hover:bg-primary/10"
                )}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Right Connection Point - show when no outgoing connection in edit mode */}
          {isEditMode && !outgoingPosition && (
            <div 
              className={cn(
                "absolute w-8 h-8 z-30 cursor-pointer transition-all",
                canReceiveFromRight && "scale-125"
              )}
              style={{ 
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${MODULE_RADIUS + 8}px)`,
              }}
              onMouseDown={(e) => handleConnectionPointMouseDown(e, "right")}
              onMouseUp={() => handleConnectionDrop("right")}
            >
              <div 
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all",
                  canReceiveFromRight 
                    ? "border-primary bg-primary/20" 
                    : "border-muted-foreground/50 bg-background hover:border-primary hover:bg-primary/10"
                )}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="text-center max-w-[140px]">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
          {title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );

  // Wrap in context menu for edit mode
  if (isEditMode) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {moduleContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </ContextMenuItem>
          <ContextMenuItem className="gap-2">
            <Play className="w-4 h-4" />
            Run this module only
          </ContextMenuItem>
          <ContextMenuItem className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Add error handler
          </ContextMenuItem>
          <ContextMenuItem className="gap-2">
            <Pencil className="w-4 h-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem className="gap-2">
            <Copy className="w-4 h-4" />
            Clone
          </ContextMenuItem>
          <ContextMenuItem className="gap-2">
            <Copy className="w-4 h-4" />
            Copy module
          </ContextMenuItem>
          <ContextMenuItem 
            className="gap-2 text-destructive focus:text-destructive"
            onClick={() => onDelete?.(id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete module
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return moduleContent;
}

// Module size constant for connection calculations
export const MODULE_RADIUS = 48; // Half of w-24 (96px / 2)
