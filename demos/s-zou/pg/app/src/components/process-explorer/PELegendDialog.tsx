import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { List, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ColorMapping {
  label: string;
  color: string;
  description?: string;
}

interface PELegendDialogProps {
  colorMappings?: ColorMapping[];
  className?: string;
}

export function PELegendDialog({ colorMappings = [], className }: PELegendDialogProps) {
  const [onlyMapped, setOnlyMapped] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const hasColorMappings = colorMappings.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 gap-2 transition-colors",
            "hover:bg-sidebar-hover",
            className
          )}
        >
          <List className="w-4 h-4" />
          <span>Legend</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Legend</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Only show mapped colors</span>
            <Switch 
              checked={onlyMapped}
              onCheckedChange={setOnlyMapped}
            />
          </div>

          {/* Color Mappings or Empty State */}
          {hasColorMappings ? (
            <div className="space-y-2">
              {colorMappings.map((mapping, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-hover transition-colors"
                >
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: mapping.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{mapping.label}</div>
                    {mapping.description && (
                      <div className="text-xs text-muted-foreground">{mapping.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <HelpCircle className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[220px]">
                No color mappings have been configured for this component.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
