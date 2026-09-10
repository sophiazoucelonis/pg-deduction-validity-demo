import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Types for the process flow
export interface ProcessObject {
  id: string;
  label: string;
  count: string;
  color: "pink" | "teal" | "purple" | "orange";
}

export interface ProcessEvent {
  id: string;
  label: string;
  count: string;
  objectIds: string[]; // Which objects pass through this event
  badges?: { label: string; color: string }[];
}

export interface ProcessConnection {
  fromEventId: string;
  toEventId: string;
  objectId: string;
  count: string;
}

// Color palette
export const objectColors = {
  pink: { path: "#e11d48", light: "#fce7f3" },
  teal: { path: "#0d9488", light: "#ccfbf1" },
  purple: { path: "#9333ea", light: "#f3e8ff" },
  orange: { path: "#ea580c", light: "#ffedd5" },
};

// Layout constants
const LANE_SPACING = 180; // Increased space between parallel vertical lanes
const EVENT_WIDTH = 120; // Reduced width for tighter fit
const EVENT_HEIGHT = 40; // Reduced height
const VERTICAL_GAP = 80;
const NODE_RADIUS = 6;
const LABEL_HEIGHT = 40;
const TOP_PADDING = 60;
const LEFT_MARGIN = 120;

// Object Label component
interface ObjectLabelProps {
  label: string;
  count: string;
  color: keyof typeof objectColors;
  x: number;
  y: number;
}

export function ObjectLabel({ label, count, color, x, y }: ObjectLabelProps) {
  const pathColor = objectColors[color].path;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="white" stroke={pathColor} strokeWidth="2" />
      <text x="16" y="-4" className="text-[11px] font-semibold" fill="#1a1a2e">
        {label}
      </text>
      <text x="16" y="10" className="text-[9px]" fill="#64748b">
        {count} objects
      </text>
    </g>
  );
}

// Event Card component - clean Celonis style
interface EventCardProps {
  event: ProcessEvent;
  x: number;
  y: number;
  objectColorMap: Map<string, string>;
}

export function EventCard({ event, x, y, objectColorMap }: EventCardProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={-EVENT_HEIGHT / 2}
        width={EVENT_WIDTH}
        height={EVENT_HEIGHT}
        rx="6"
        fill="white"
        stroke="#e2e8f0"
        strokeWidth="1"
        filter="url(#cardShadow)"
      />
      
      {/* Colored entry dots on the left edge */}
      {event.objectIds.map((objId, idx) => {
        const color = objectColorMap.get(objId) || "#888";
        const dotY = (idx - (event.objectIds.length - 1) / 2) * 14;
        return (
          <circle
            key={objId}
            cx={0}
            cy={dotY}
            r={NODE_RADIUS}
            fill={color}
          />
        );
      })}
      
      {/* Event name */}
      <text x={EVENT_WIDTH / 2} y="-3" textAnchor="middle" className="text-[10px] font-medium" fill="#1a1a2e">
        {event.label}
      </text>
      
      {/* Count - simple text, no badges */}
      <text x={EVENT_WIDTH / 2} y="12" textAnchor="middle" className="text-[9px]" fill="#64748b">
        {event.count} Times
      </text>
    </g>
  );
}

// Edge count label with clock icon
export function EdgeCount({ count, x, y, color }: { count: string; x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="9" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      {/* Clock icon */}
      <circle cx="0" cy="0" r="5" fill="none" stroke={color || "#64748b"} strokeWidth="1" />
      <line x1="0" y1="0" x2="0" y2="-3" stroke={color || "#64748b"} strokeWidth="1" />
      <line x1="0" y1="0" x2="2" y2="1" stroke={color || "#64748b"} strokeWidth="1" />
      <text x="14" y="4" className="text-[8px]" fill="#64748b">{count}</text>
    </g>
  );
}

// Main Process Flow Component
interface ProcessFlowProps {
  objects: ProcessObject[];
  events: ProcessEvent[];
  connections: ProcessConnection[];
  className?: string;
}

export function ProcessFlow({ objects, events, connections, className }: ProcessFlowProps) {
  const layout = useMemo(() => {
    const objectColorMap = new Map<string, string>();
    objects.forEach(obj => {
      objectColorMap.set(obj.id, objectColors[obj.color].path);
    });

    // Calculate event depths (row positions)
    const eventDeps = new Map<string, Set<string>>();
    events.forEach(e => eventDeps.set(e.id, new Set()));
    connections.forEach(conn => {
      const deps = eventDeps.get(conn.toEventId);
      if (deps) deps.add(conn.fromEventId);
    });

    const eventDepth = new Map<string, number>();
    const getDepth = (eventId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(eventId)) return 0;
      if (eventDepth.has(eventId)) return eventDepth.get(eventId)!;
      visited.add(eventId);
      const deps = eventDeps.get(eventId) || new Set();
      if (deps.size === 0) {
        eventDepth.set(eventId, 0);
        return 0;
      }
      const maxDep = Math.max(...Array.from(deps).map(d => getDepth(d, visited)));
      const depth = maxDep + 1;
      eventDepth.set(eventId, depth);
      return depth;
    };
    events.forEach(e => getDepth(e.id));

    // Build event sequences per object
    const objectSequences = new Map<string, string[]>();
    objects.forEach(obj => {
      const objConnections = connections.filter(c => c.objectId === obj.id);
      const objEvents = events.filter(e => e.objectIds.includes(obj.id));
      if (objEvents.length === 0) return;
      
      const targetEvents = new Set(objConnections.map(c => c.toEventId));
      const startEvent = objEvents.find(e => !targetEvents.has(e.id));
      
      const sequence: string[] = [];
      const visited = new Set<string>();
      const buildSequence = (eventId: string) => {
        if (visited.has(eventId)) return;
        visited.add(eventId);
        sequence.push(eventId);
        const next = objConnections.find(c => c.fromEventId === eventId);
        if (next) buildSequence(next.toEventId);
      };
      if (startEvent) buildSequence(startEvent.id);
      objectSequences.set(obj.id, sequence);
    });

    // Find the center X for events
    const centerX = LEFT_MARGIN + 250;
    
    // Calculate lane X positions for each object (vertical lines to the left of events)
    const laneX = new Map<string, number>();
    objects.forEach((obj, idx) => {
      laneX.set(obj.id, centerX - 40 - idx * LANE_SPACING);
    });
    
    // Calculate event Y positions
    const eventRows = new Map<string, number>();
    events.forEach(e => eventRows.set(e.id, eventDepth.get(e.id) || 0));

    // Position events - exclusive events align with their lane, shared events in center
    const eventPositions = new Map<string, { x: number; y: number }>();
    events.forEach(event => {
      const row = eventRows.get(event.id) || 0;
      const y = TOP_PADDING + LABEL_HEIGHT + 40 + row * (EVENT_HEIGHT + VERTICAL_GAP);
      
      if (event.objectIds.length === 1) {
        // Exclusive event - position aligned with the object's lane
        const objLane = laneX.get(event.objectIds[0]) || centerX - 40;
        eventPositions.set(event.id, { x: objLane + 40, y });
      } else {
        // Shared event - position at center between involved lanes
        const involvedLanes = event.objectIds.map(id => laneX.get(id) || centerX);
        const avgX = involvedLanes.reduce((a, b) => a + b, 0) / involvedLanes.length;
        eventPositions.set(event.id, { x: avgX + 40, y });
      }
    });

    // Generate straight vertical lane paths with curves into events
    const pathSegments: { d: string; color: string }[] = [];
    const edgeCounts: { x: number; y: number; count: string; color: string }[] = [];

    objects.forEach(obj => {
      const sequence = objectSequences.get(obj.id) || [];
      if (sequence.length === 0) return;
      
      const color = objectColors[obj.color].path;
      const objLaneX = laneX.get(obj.id) || centerX - 30;
      
      sequence.forEach((eventId, idx) => {
        const pos = eventPositions.get(eventId);
        if (!pos) return;
        
        const event = events.find(e => e.id === eventId);
        if (!event) return;
        
        const nodeIdx = event.objectIds.indexOf(obj.id);
        const nodeY = (nodeIdx - (event.objectIds.length - 1) / 2) * 16;
        
        // Entry curve into event
        const curveStartY = pos.y + nodeY - 25;
        const curveEndX = pos.x;
        const curveEndY = pos.y + nodeY;
        
        // Curve from lane into event (quarter circle)
        const entryPath = `M ${objLaneX} ${curveStartY} 
                           Q ${objLaneX} ${curveEndY}, ${curveEndX} ${curveEndY}`;
        pathSegments.push({ d: entryPath, color });
        
        // If there's a next event, draw the vertical connector and exit curve
        if (idx < sequence.length - 1) {
          const nextEventId = sequence[idx + 1];
          const nextPos = eventPositions.get(nextEventId);
          const conn = connections.find(c => c.fromEventId === eventId && c.toEventId === nextEventId && c.objectId === obj.id);
          
          if (nextPos && conn) {
            const nextEvent = events.find(e => e.id === nextEventId);
            if (!nextEvent) return;
            
            const nextNodeIdx = nextEvent.objectIds.indexOf(obj.id);
            const nextNodeY = (nextNodeIdx - (nextEvent.objectIds.length - 1) / 2) * 16;
            
            // Exit from current event back to lane
            const exitY = pos.y + nodeY + 25;
            const exitPath = `M ${curveEndX} ${curveEndY} 
                              Q ${objLaneX} ${curveEndY}, ${objLaneX} ${exitY}`;
            pathSegments.push({ d: exitPath, color });
            
            // Vertical line down the lane
            const nextCurveStartY = nextPos.y + nextNodeY - 25;
            const verticalPath = `M ${objLaneX} ${exitY} L ${objLaneX} ${nextCurveStartY}`;
            pathSegments.push({ d: verticalPath, color });
            
            // Add edge count in the middle of vertical segment
            const midY = (exitY + nextCurveStartY) / 2;
            edgeCounts.push({ x: objLaneX, y: midY, count: conn.count, color });
          }
        }
      });
    });

    // Start paths from labels to first event
    const startPaths: { d: string; color: string }[] = [];
    const labelPositions: { obj: ProcessObject; x: number; y: number }[] = [];

    objects.forEach(obj => {
      const sequence = objectSequences.get(obj.id) || [];
      if (sequence.length === 0) return;
      
      const color = objectColors[obj.color].path;
      const objLaneX = laneX.get(obj.id) || centerX - 30;
      const labelY = TOP_PADDING + LABEL_HEIGHT;
      
      labelPositions.push({ obj, x: objLaneX, y: labelY });
      
      const firstEventId = sequence[0];
      const firstPos = eventPositions.get(firstEventId);
      if (!firstPos) return;
      
      const firstEvent = events.find(e => e.id === firstEventId);
      if (!firstEvent) return;
      
      const nodeIdx = firstEvent.objectIds.indexOf(obj.id);
      const nodeY = (nodeIdx - (firstEvent.objectIds.length - 1) / 2) * 16;
      const targetY = firstPos.y + nodeY - 25;
      
      // Straight line from label down
      const startPath = `M ${objLaneX} ${labelY + 15} L ${objLaneX} ${targetY}`;
      startPaths.push({ d: startPath, color });
    });

    return {
      eventPositions,
      objectColorMap,
      pathSegments,
      startPaths,
      labelPositions,
      edgeCounts,
    };
  }, [objects, events, connections]);

  const allPositions = Array.from(layout.eventPositions.values());
  const maxX = Math.max(...allPositions.map(p => p.x)) + EVENT_WIDTH + 50;
  const maxY = Math.max(...allPositions.map(p => p.y)) + 80;

  return (
    <svg 
      className={cn("min-w-full min-h-full", className)}
      width={Math.max(maxX, 500)}
      height={Math.max(maxY, 400)}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
        </filter>
      </defs>
      
      {/* Start paths (vertical from labels) */}
      {layout.startPaths.map((p, idx) => (
        <path key={`start-${idx}`} d={p.d} stroke={p.color} strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      
      {/* All path segments */}
      {layout.pathSegments.map((seg, idx) => (
        <path key={`seg-${idx}`} d={seg.d} stroke={seg.color} strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      
      {/* Edge counts */}
      {layout.edgeCounts.map((ec, idx) => (
        <EdgeCount key={`ec-${idx}`} count={ec.count} x={ec.x} y={ec.y} color={ec.color} />
      ))}
      
      {/* Object labels */}
      {layout.labelPositions.map(({ obj, x, y }) => (
        <ObjectLabel key={obj.id} label={obj.label} count={obj.count} color={obj.color} x={x} y={y} />
      ))}
      
      {/* Event cards */}
      {Array.from(layout.eventPositions.entries()).map(([eventId, pos]) => {
        const event = events.find(e => e.id === eventId);
        if (!event) return null;
        return (
          <EventCard key={eventId} event={event} x={pos.x} y={pos.y} objectColorMap={layout.objectColorMap} />
        );
      })}
    </svg>
  );
}

// Compatibility exports
export function PathNode({ color }: { color: keyof typeof objectColors }) {
  return <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: objectColors[color].path }} />;
}
