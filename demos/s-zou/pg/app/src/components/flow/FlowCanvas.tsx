import { useState, useRef, useCallback, WheelEvent } from "react";
import { cn } from "@/lib/utils";
import { Plus, Settings, Wrench, FileCode, Mail } from "lucide-react";

interface FlowCanvasProps {
  children: React.ReactNode;
  className?: string;
  onAddModule?: () => void;
  showAddButton?: boolean;
  toolbarItems?: { id: string; icon: React.ReactNode; color: string; label: string }[];
  favoriteItems?: { id: string; icon: React.ReactNode; color: string; label: string }[];
  onZoomChange?: (zoom: number) => void;
  onCanvasClick?: () => void;
  onFlowControlClick?: () => void;
  isEditMode?: boolean;
  flowControlPicker?: React.ReactNode;
}

const defaultToolbarItems = [
  { id: "settings", icon: <Settings className="w-5 h-5 text-white" />, color: "bg-[#22c55e]", label: "Settings" },
  { id: "parser", icon: <FileCode className="w-5 h-5 text-white" />, color: "bg-[#f97316]", label: "Text Parser" },
  { id: "tools", icon: <Wrench className="w-5 h-5 text-white" />, color: "bg-[#8b5cf6]", label: "Tools" },
];

const defaultFavoriteItems = [
  { id: "outlook", icon: <Mail className="w-5 h-5 text-white" />, color: "bg-[#0078D4]", label: "Outlook" },
];

export function FlowCanvas({ 
  children, 
  className, 
  onAddModule, 
  showAddButton = true,
  toolbarItems = defaultToolbarItems,
  favoriteItems = defaultFavoriteItems,
  onZoomChange,
  onCanvasClick,
  onFlowControlClick,
  isEditMode = false,
  flowControlPicker,
}: FlowCanvasProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    // Scroll to zoom directly (no ctrl/cmd needed) – match Process Explorer behavior
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.min(200, Math.max(25, zoom + delta));
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [zoom, onZoomChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setHasMoved(false);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setHasMoved(true);
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    // If we didn't move, treat it as a click on the canvas
    if (!hasMoved && onCanvasClick) {
      onCanvasClick();
    }
    setIsDragging(false);
  }, [hasMoved, onCanvasClick]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 overflow-hidden",
        "cursor-grab",
        isDragging && "cursor-grabbing",
        className
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: `
            radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          backgroundPosition: `${position.x % 24}px ${position.y % 24}px`,
        }}
      />

      {/* Canvas Content */}
      <div 
        className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>

      {/* Bottom Toolbar - Tools and Favorites - only show in edit mode */}
      <div className={cn(
        "absolute bottom-4 left-4 flex items-start gap-6 z-10",
        !isEditMode && "hidden",
        toolbarItems.length === 0 && favoriteItems.length === 0 && !showAddButton && "hidden"
      )}>
        {/* Tools Section */}
        <div className={cn("flex flex-col gap-2", toolbarItems.length === 0 && "hidden")}>
          <span className="text-xs font-medium text-muted-foreground">Tools</span>
          <div className="flex items-center gap-2">
            {toolbarItems.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  // Green "settings" button opens Flow Control picker
                  if (item.id === "settings" && onFlowControlClick) {
                    onFlowControlClick();
                  }
                }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:opacity-80",
                  item.color
                )}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Favorites Section */}
        <div className={cn("flex flex-col gap-2", favoriteItems.length === 0 && !showAddButton && "hidden")}>
          <span className="text-xs font-medium text-muted-foreground">Favorites</span>
          <div className="flex items-center gap-2">
            {favoriteItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:opacity-80",
                  item.color
                )}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
            {/* Add to Favorites button */}
            {showAddButton && (
              <div className="add-module-trigger">
                <button
                  onClick={onAddModule}
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
                  title="Add module"
                >
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flow Control Picker - rendered inside canvas to stay within bounds */}
      {flowControlPicker}
    </div>
  );
}
