import { Button } from "@/components/ui/button";
import { 
  Play, 
  Square,
  Clock,
  ChevronDown,
} from "lucide-react";

interface PEToolbarProps {
  flowName: string;
  eventCount?: number;
  totalEvents?: number;
}

export function PEToolbar({ flowName, eventCount = 22, totalEvents = 22 }: PEToolbarProps) {
  return (
    <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{flowName}</h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Events</span>
        <span className="font-medium text-foreground">{eventCount} of {totalEvents}</span>
      </div>
    </div>
  );
}

export function PEBottomToolbar() {
  return (
    <div className="h-12 border-t border-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Play className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Square className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-2" />
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Clock className="h-4 w-4" />
          <span>DD</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <Button variant="outline" size="sm" className="h-8">
        Legend
      </Button>
    </div>
  );
}
