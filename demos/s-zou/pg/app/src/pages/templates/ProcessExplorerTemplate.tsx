import { useState, useRef, useCallback, WheelEvent, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { 
  PEToolbar, 
  PEBottomToolbar,
  PEMetroFlow,
  PEObjectSelector,
  PEGraphControl,
  PELegendDialog,
  PEKpiSelector,
  type KpiType,
} from "@/components/process-explorer";
import { TemplateBanner } from "@/components/ui/template-banner";
import { Play, Square, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Object color palette
const objectColors: Record<string, string> = {
  "obj-1": "#e11d48", // pink/rose
  "obj-2": "#0d9488", // teal
  "obj-3": "#ea580c", // orange
};

// Template data with realistic names
// Order: Customer invoice item, Sales order item, Delivery item
// This puts obj-3 and obj-1 adjacent so their shared events cluster properly
const allObjects = [
  { id: "obj-3", label: "Customer invoice item", count: "165K", color: objectColors["obj-3"] },
  { id: "obj-1", label: "Sales order item", count: "410K", color: objectColors["obj-1"] },
  { id: "obj-2", label: "Delivery item", count: "361K", color: objectColors["obj-2"] },
];

// Events with object associations and per-object counts
// syncLevel allows forcing an event to appear at a specific level for lane synchronization
const allEvents = [
  // Sales order item events (levels 0-4)
  { id: "evt-1", label: "Create Sales Order Header", count: "27.3K", objectIds: ["obj-1"] },
  { id: "evt-2", label: "Create Sales Order Item", count: "410K", objectIds: ["obj-1"] },
  { id: "evt-3", label: "Approve Sales Order", count: "25.4K", objectIds: ["obj-1"] },
  { id: "evt-4", label: "Approve Sales Order Item", count: "382K", objectIds: ["obj-1"] },
  
  // Delivery item events - Execute Picking syncs to level 3 (same as Approve Sales Order Item)
  { id: "evt-5", label: "Execute Picking", count: "23.3K", objectIds: ["obj-2"], syncLevel: 3 },
  
  // Shared events - delivery and sales order intersect (with per-object counts)
  { id: "evt-6", label: "Create Delivery Header", count: "24K", objectIds: ["obj-1", "obj-2"], countsByObject: { "obj-1": "24K", "obj-2": "24K" } },
  { id: "evt-7", label: "Create Delivery Item", count: "361K", objectIds: ["obj-1", "obj-2"], countsByObject: { "obj-1": "361K", "obj-2": "348K" } },
  
  // Customer invoice item starts at level 5 (same as Create Delivery Item)
  
  // Post delivery events  
  { id: "evt-10", label: "Create Customer Invoice", count: "21.8K", objectIds: ["obj-1", "obj-3"], countsByObject: { "obj-1": "330K", "obj-3": "165K" } },
  { id: "evt-8", label: "Post Goods Issue", count: "335K", objectIds: ["obj-2"] },
  { id: "evt-9", label: "Sign Proof Of Delivery", count: "20.9K", objectIds: ["obj-2"] },
];

// Connections define the flow order
const allConnections = [
  // Sales order item path
  { fromEventId: "evt-1", toEventId: "evt-2", objectId: "obj-1", count: "410K" },
  { fromEventId: "evt-2", toEventId: "evt-3", objectId: "obj-1", count: "382K" },
  { fromEventId: "evt-3", toEventId: "evt-4", objectId: "obj-1", count: "382K" },
  { fromEventId: "evt-4", toEventId: "evt-6", objectId: "obj-1", count: "361K" },
  { fromEventId: "evt-6", toEventId: "evt-7", objectId: "obj-1", count: "361K" },
  { fromEventId: "evt-7", toEventId: "evt-10", objectId: "obj-1", count: "330K" },
  
  // Delivery item path - Execute Picking leads into the shared Create Delivery Header
  { fromEventId: "evt-5", toEventId: "evt-6", objectId: "obj-2", count: "188K" },
  { fromEventId: "evt-6", toEventId: "evt-7", objectId: "obj-2", count: "348K" },
  { fromEventId: "evt-7", toEventId: "evt-8", objectId: "obj-2", count: "190K" },
  { fromEventId: "evt-8", toEventId: "evt-9", objectId: "obj-2", count: "312K" },
  
  // Customer invoice item path - starts at Create Customer Invoice (shared with obj-1)
  // obj-3's first event is evt-10 (Create Customer Invoice), which is shared with obj-1
];


export default function ProcessExplorerTemplate() {
  const navigate = useNavigate();
  
  // Object selection state
  const [selectedObjects, setSelectedObjects] = useState<string[]>(["obj-1", "obj-2", "obj-3"]);
  
  // Graph control state
  const [controlObjectId, setControlObjectId] = useState<string>("obj-2");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    allEvents.map(e => e.id)
  );
  const [selectedConnections, setSelectedConnections] = useState<Array<{ from: string; to: string; objectId: string }>>(
    allConnections.map(c => ({ from: c.fromEventId, to: c.toEventId, objectId: c.objectId }))
  );
  
  // KPI selection state
  const [selectedKpi, setSelectedKpi] = useState<KpiType>("event-count");
  
  // Zoom and pan state - start with offset to center graph away from left controls
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 350, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  const toggleObject = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId) 
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const toggleConnection = (from: string, to: string, objectId: string) => {
    setSelectedConnections(prev => {
      const exists = prev.some(c => c.from === from && c.to === to && c.objectId === objectId);
      if (exists) {
        return prev.filter(c => !(c.from === from && c.to === to && c.objectId === objectId));
      }
      return [...prev, { from, to, objectId }];
    });
  };

  // Scroll to zoom directly (no ctrl/cmd needed) - more reactive with larger delta
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom(prev => Math.min(200, Math.max(25, prev + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Filter data based on selected objects
  const visibleObjects = useMemo(() => 
    allObjects.filter(obj => selectedObjects.includes(obj.id)),
    [selectedObjects]
  );

  const visibleEvents = useMemo(() => 
    allEvents.filter(evt => 
      evt.objectIds.some(id => selectedObjects.includes(id))
    ).map(evt => ({
      ...evt,
      objectIds: evt.objectIds.filter(id => selectedObjects.includes(id)),
    })),
    [selectedObjects]
  );

  const visibleConnections = useMemo(() =>
    allConnections.filter(conn => selectedObjects.includes(conn.objectId)),
    [selectedObjects]
  );

  // Prepare connection items for graph control
  const connectionItems = useMemo(() =>
    visibleConnections.map(c => {
      const fromEvent = allEvents.find(e => e.id === c.fromEventId);
      const toEvent = allEvents.find(e => e.id === c.toEventId);
      return {
        ...c,
        label: `${fromEvent?.label || ''} → ${toEvent?.label || ''}`,
      };
    }),
    [visibleConnections]
  );

  // Count of visible events and total
  const eventCount = visibleEvents.filter(e => selectedEvents.includes(e.id)).length;
  const totalEvents = allEvents.length;

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-process-explorer"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "AI Demo Space", type: "space" as const },
        { label: "Test", type: "package" as const, hasDropdown: true },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col">
        {/* PE Toolbar */}
        <PEToolbar flowName="Sample Process Explorer" eventCount={eventCount} totalEvents={totalEvents} />

        {/* Template Banner */}
        <TemplateBanner
          title="Process Explorer Template"
          description="Metro-line visualization. Hover over activities to highlight connections. Click objects panel to filter."
        />

        {/* Zoomable Flow Canvas */}
        <div 
          ref={containerRef}
          className={cn(
            "flex-1 relative bg-white overflow-hidden cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* KPI Selector and Object Selector - side by side */}
          <div className="absolute top-4 left-4 z-30 flex items-start gap-2">
            <PEKpiSelector
              selectedKpi={selectedKpi}
              onSelectKpi={setSelectedKpi}
            />
            <PEObjectSelector
              objects={allObjects.map(o => ({
                id: o.id,
                label: o.label,
                color: o.color,
                count: o.count,
              }))}
              selectedObjects={selectedObjects}
              onToggleObject={toggleObject}
              maxObjects={16}
            />
          </div>

          {/* Graph Control Panel - positioned below object selector */}
          <div className="absolute top-[60px] left-4 z-20">
            <PEGraphControl
              objects={visibleObjects.map(o => ({
                id: o.id,
                label: o.label,
                color: o.color,
              }))}
              events={visibleEvents}
              connections={connectionItems}
              selectedObjectId={controlObjectId}
              onSelectObject={setControlObjectId}
              selectedEvents={selectedEvents}
              onToggleEvent={toggleEvent}
              selectedConnections={selectedConnections}
              onToggleConnection={toggleConnection}
            />
          </div>

          {/* Zoomable/Pannable Content */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
              transformOrigin: 'top left',
            }}
          >
            <PEMetroFlow 
              objects={visibleObjects}
              events={visibleEvents}
              connections={visibleConnections}
              selectedEvents={selectedEvents}
              selectedConnections={selectedConnections}
              kpiType={selectedKpi}
            />
          </div>

          {/* Bottom Left Toolbar - Play, View Mode, Time Range */}
          <div className="absolute bottom-6 left-6 flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm z-10">
            {/* Play Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Play className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border" />
            
            {/* View Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                  <Square className="w-4 h-4 fill-current" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Standard View</DropdownMenuItem>
                <DropdownMenuItem>Compact View</DropdownMenuItem>
                <DropdownMenuItem>Expanded View</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="w-px h-6 bg-border" />
            
            {/* Time Range Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">DD</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Days (DD)</DropdownMenuItem>
                <DropdownMenuItem>Weeks (WW)</DropdownMenuItem>
                <DropdownMenuItem>Months (MM)</DropdownMenuItem>
                <DropdownMenuItem>Years (YY)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom Right - Legend and Zoom */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
            <PELegendDialog />
            
            {/* Zoom percentage display */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-3 h-8 shadow-sm">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                −
              </button>
              <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
