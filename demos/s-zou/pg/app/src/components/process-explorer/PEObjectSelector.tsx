import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ObjectOption {
  id: string;
  label: string;
  color: string;
  count: string;
}

interface PEObjectSelectorProps {
  objects: ObjectOption[];
  selectedObjects: string[];
  onToggleObject: (objectId: string) => void;
  maxObjects?: number;
  className?: string;
}

export function PEObjectSelector({
  objects,
  selectedObjects,
  onToggleObject,
  maxObjects = 16,
  className,
}: PEObjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDots = selectedObjects.slice(0, 4).map((objId) => {
    const obj = objects.find(o => o.id === objId);
    return obj ? { id: objId, color: obj.color } : null;
  }).filter(Boolean);

  return (
    <div className={cn("", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Collapsed view - pill button with tooltip */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-10 px-3 gap-2 rounded-full transition-all",
                    "bg-muted hover:bg-muted/80",
                    isOpen && "rounded-b-none rounded-t-2xl bg-white border border-border border-b-0 hover:bg-white"
                  )}
                >
                  <div className="flex items-center -space-x-1.5">
                    {selectedDots.map((dot) => dot && (
                      <div
                        key={dot.id}
                        className="w-4 h-4 rounded-full border-2 border-white"
                        style={{ backgroundColor: dot.color }}
                      />
                    ))}
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground rotate-180 transition-transform" />
                  ) : (
                    <Check className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent side="right" className="bg-white border border-border text-foreground shadow-md">
                <p>Select Eventlogs to be displayed</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <CollapsibleContent className="bg-white border border-t-0 border-border rounded-b-2xl shadow-lg">
          <div className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-3">
              Eventlogs (Max. {maxObjects} Objects)
            </div>
            
            <div className="space-y-1">
              {objects.map((obj) => {
                const isSelected = selectedObjects.includes(obj.id);
                return (
                  <label
                    key={obj.id}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors",
                      isSelected 
                        ? "bg-sidebar-active" 
                        : "hover:bg-sidebar-hover"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleObject(obj.id)}
                      className={cn(
                        "h-4 w-4 rounded",
                        isSelected && "border-sidebar-active-foreground"
                      )}
                    />
                    <span className={cn(
                      "text-sm flex-1",
                      isSelected ? "text-sidebar-active-foreground font-medium" : "text-foreground"
                    )}>
                      {obj.label}
                    </span>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: obj.color }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
