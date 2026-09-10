import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EventItem {
  id: string;
  label: string;
  count: string;
  objectIds: string[];
}

export interface ConnectionItem {
  fromEventId: string;
  toEventId: string;
  objectId: string;
  count: string;
  label: string;
}

export interface ObjectItem {
  id: string;
  label: string;
  color: string;
}

interface PEGraphControlProps {
  objects: ObjectItem[];
  events: EventItem[];
  connections: ConnectionItem[];
  selectedObjectId: string;
  onSelectObject: (objectId: string) => void;
  selectedEvents: string[];
  onToggleEvent: (eventId: string) => void;
  selectedConnections: Array<{ from: string; to: string; objectId: string }>;
  onToggleConnection: (from: string, to: string, objectId: string) => void;
  className?: string;
}

export function PEGraphControl({
  objects,
  events,
  connections,
  selectedObjectId,
  onSelectObject,
  selectedEvents,
  onToggleEvent,
  selectedConnections,
  onToggleConnection,
  className,
}: PEGraphControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"events" | "connections">("events");

  const currentObject = objects.find(o => o.id === selectedObjectId);
  
  // Filter events and connections by selected object
  const filteredEvents = events.filter(e => 
    e.objectIds.includes(selectedObjectId) &&
    e.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredConnections = connections.filter(c => 
    c.objectId === selectedObjectId &&
    c.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEventCount = selectedEvents.filter(id => 
    filteredEvents.some(e => e.id === id)
  ).length;

  const selectedConnectionCount = selectedConnections.filter(c => 
    filteredConnections.some(fc => 
      fc.fromEventId === c.from && fc.toEventId === c.to && fc.objectId === c.objectId
    )
  ).length;

  return (
    <div className={cn(
      "bg-white border border-border rounded-lg shadow-lg transition-all duration-200",
      isExpanded ? "w-[320px]" : "w-[220px]",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Graph Control</span>
        </div>

        {/* Object Selector */}
        <Select value={selectedObjectId} onValueChange={onSelectObject}>
          <SelectTrigger className={cn(
            "w-full h-9 border-2",
            currentObject && "border-sidebar-active-foreground"
          )}>
            <SelectValue placeholder="Select object" />
          </SelectTrigger>
          <SelectContent>
            {objects.map(obj => (
              <SelectItem key={obj.id} value={obj.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: obj.color }}
                  />
                  <span>{obj.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Collapsible Content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Counts row - only show when collapsed */}
        {!isExpanded && (
          <div className="px-3 py-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {selectedEventCount} of {filteredEvents.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">≡</span>
              <span className="text-muted-foreground">
                {selectedConnectionCount} of {filteredConnections.length}
              </span>
            </div>
          </div>
        )}

        <CollapsibleContent className="border-t border-border">
          <div className="p-3">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "events" | "connections")}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="events" className="text-xs h-7">
                  <Settings2 className="w-3 h-3 mr-1" />
                  Events
                  <span className="ml-1 text-muted-foreground">
                    {selectedEventCount} of {filteredEvents.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="connections" className="text-xs h-7">
                  ≡ Connections
                  <span className="ml-1 text-muted-foreground">
                    {selectedConnectionCount} of {filteredConnections.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Events Tab */}
              <TabsContent value="events" className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2 px-1">
                  <div className="flex items-center gap-1">
                    <span>Event Name</span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>→ Objects</span>
                    <ChevronDown className="w-3 h-3" />
                    <Settings2 className="w-3 h-3" />
                  </div>
                </div>

                <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                  {filteredEvents.map(event => {
                    const isSelected = selectedEvents.includes(event.id);
                    return (
                      <label
                        key={event.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
                          isSelected ? "bg-sidebar-active" : "hover:bg-sidebar-hover"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleEvent(event.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={cn(
                          "text-xs flex-1 truncate",
                          isSelected && "text-sidebar-active-foreground font-medium"
                        )}>
                          {event.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Connections Tab */}
              <TabsContent value="connections" className="mt-3">
                <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                  {filteredConnections.map((conn, idx) => {
                    const isSelected = selectedConnections.some(
                      c => c.from === conn.fromEventId && c.to === conn.toEventId && c.objectId === conn.objectId
                    );
                    return (
                      <label
                        key={`${conn.fromEventId}-${conn.toEventId}-${idx}`}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
                          isSelected ? "bg-sidebar-active" : "hover:bg-sidebar-hover"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleConnection(conn.fromEventId, conn.toEventId, conn.objectId)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={cn(
                          "text-xs flex-1 truncate",
                          isSelected && "text-sidebar-active-foreground font-medium"
                        )}>
                          {conn.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {conn.count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>

        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full h-8 justify-center gap-1 text-xs text-sidebar-active-foreground hover:text-sidebar-active-foreground border-t border-border rounded-none"
          >
            <span>{isExpanded ? "Collapse Control" : "Expand Control"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
