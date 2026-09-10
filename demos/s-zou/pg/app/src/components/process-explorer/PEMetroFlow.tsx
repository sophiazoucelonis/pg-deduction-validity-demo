import { cn } from "@/lib/utils";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { type KpiType, isTimeKpi } from "./PEKpiSelector";
import { Clock, Timer } from "lucide-react";

// Types for the process flow
export interface ProcessObject {
  id: string;
  label: string;
  count: string;
  color: string; // hex color
}

export interface ProcessEvent {
  id: string;
  label: string;
  /** Object volume — count of objects flowing through this event, e.g. "32K objects". Shown on card subtitle in object-count mode. */
  count: string;
  /** Event occurrence count — how many times this event was logged, e.g. "41K times". Shown on card subtitle in event-count and throughput-time modes. Falls back to `count` if absent. */
  eventCount?: string;
  objectIds: string[]; // Which objects pass through this event
  countsByObject?: Record<string, string>; // Optional per-object counts
  syncLevel?: number; // Force this event to appear at a specific level for lane synchronization
}

export interface ProcessConnection {
  fromEventId: string;
  toEventId: string;
  objectId: string;
  count: string;
  /** Optional throughput-time label (e.g. "18d", "14h"). Used when KPI toggle is set to a Throughput Time mode. */
  throughputTime?: string;
}

// Layout constants
const VERTICAL_GAP = 120;
const TOP_PADDING = 100;
const LEFT_MARGIN = 80;
const LANE_SPACING = 250; // Spacing between object lanes (increased to prevent card overlap)
const NODE_RADIUS = 10;
const CARD_OFFSET = 28; // Gap between rightmost dot and card (real Celonis ~24-28px)
const CARD_WIDTH_MIN = 130;
const CARD_WIDTH_MAX = 200;
const CORNER_RADIUS = 30; // Smooth corner radius for orthogonal paths (real Celonis uses generous curves)
const NEW_LANE_INTRO_OFFSET = 120; // Extra Y added at events that introduce a new lane, so the new lane's start port + label has clear vertical room above the shared event AND the lane stub's horizontal bend has clearance from the event card top

// Mock throughput time data for demo (in minutes)
const mockThroughputTimes: Record<string, number> = {
  "evt-1-evt-2": 30,      // 30 min
  "evt-2-evt-3": 1440,    // 1 day
  "evt-3-evt-4": 0,       // 0 ms
  "evt-4-evt-6": 120,     // 2 hours
  "evt-6-evt-7": 60,      // 1 hour
  "evt-7-evt-10": 2880,   // 2 days
  "evt-5-evt-6": 45,      // 45 min
  "evt-7-evt-8": 180,     // 3 hours
  "evt-8-evt-9": 30,      // 30 min
};

// Format time based on minutes
function formatTime(minutes: number): string {
  if (minutes === 0) return "0 ms";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} d`;
}

/**
 * Parse a count string like "124K", "71.1K", "1.2M" into a numeric value.
 * Returns null for unparsable strings (e.g. throughput-time labels like "18d"
 * which use the same `count` field but represent durations, not volumes).
 */
function parseCount(s: string): number | null {
  const match = s.match(/^([\d.]+)\s*([kKmM]?)\s*$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!isFinite(num)) return null;
  const suffix = match[2].toLowerCase();
  if (suffix === "k") return num * 1000;
  if (suffix === "m") return num * 1_000_000;
  return num;
}

/**
 * Map a connection's count to a stroke-width in [min,max] px range.
 * Real Celonis encodes flow volume in line thickness — high-volume edges are
 * visibly thicker. Unparsable counts (durations etc.) get the middle width.
 */
function strokeWidthForCount(
  count: string,
  range: { min: number; max: number },
  defaultWidth = 6,
): number {
  const n = parseCount(count);
  if (n === null) return defaultWidth;
  if (range.max === range.min) return defaultWidth;
  const t = (n - range.min) / (range.max - range.min);
  return 3 + t * 5; // 3px (min volume) → 8px (max volume)
}

/**
 * Compute the visible card width for an event card. Sized for the longest
 * subtitle the card might show across all KPI modes so the canvas layout
 * stays stable when the user toggles modes.
 */
function computeCardWidth(label: string, ...subtitles: string[]): number {
  const titleLen = Math.min(label.length, 26); // truncated at 26 + ellipsis
  const titleW = titleLen * 7;
  const subtitleW = Math.max(...subtitles.map((s) => s.length * 6.5));
  const contentW = Math.max(titleW, subtitleW);
  return Math.min(CARD_WIDTH_MAX, Math.max(CARD_WIDTH_MIN, contentW + 28));
}

/** Deviation event passed in from ProcessExplorer. Side determines which side
 *  of the parent lane it sits on; bundleKey ties it to its reveal cohort for
 *  the 5s highlight. */
export interface DeviationEventInput {
  id: string;
  label: string;
  event_count: string;
  object_id: string;
  side?: "left" | "right";
  bundleKey: string;
}

/** Deviation connection — a new edge added by either an event-deviation
 *  bundle or a connection-deviation bundle. */
export interface DeviationConnectionInput {
  from_event_id: string;
  to_event_id: string;
  object_id: string;
  count?: string;
  throughput_time?: string;
  bundleKey: string;
}

interface MetroFlowProps {
  objects: ProcessObject[];
  events: ProcessEvent[];
  connections: ProcessConnection[];
  selectedEvents?: string[];
  selectedConnections?: Array<{ from: string; to: string; objectId: string }>;
  kpiType?: KpiType;
  /** Deviation event nodes to render alongside the main flow. */
  deviationEvents?: DeviationEventInput[];
  /** Deviation edges to render. May reference main or deviation events. */
  deviationConnections?: DeviationConnectionInput[];
  /** FULL (un-sliced) deviation set for the visible lanes — used ONLY to
   *  reserve horizontal lane room (G4b/G7) so lane X positions stay stable as
   *  the slider reveals deviations one at a time. Falls back to the rendered
   *  (sliced) deviationEvents/Connections when not provided. */
  reserveDeviationEvents?: DeviationEventInput[];
  reserveDeviationConnections?: DeviationConnectionInput[];
  /** Bundle keys currently within their 5s highlight window. Items with a
   *  matching bundleKey paint the #86b8fe halo. */
  highlightedBundleKeys?: Set<string>;
  /** Increments each time a slider tick reveals new bundles. Triggers an
   *  auto-pan to centre the newly-revealed items in the viewport. */
  revealTick?: number;
  /** Bundle keys revealed by the most recent slider tick — drives the focus
   *  centroid for the auto-pan. */
  lastRevealedKeys?: string[];
  className?: string;
}

export function PEMetroFlow({
  objects: rawObjects,
  events,
  connections,
  selectedEvents,
  selectedConnections,
  kpiType = "event-count",
  deviationEvents = [],
  deviationConnections = [],
  reserveDeviationEvents,
  reserveDeviationConnections,
  highlightedBundleKeys,
  revealTick,
  lastRevealedKeys,
  className
}: MetroFlowProps) {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<{ from: string; to: string; objectId: string } | null>(null);

  // ----- Lane order optimization -----
  // YAML object order is the author's input, but the visual quality of the
  // subway-map layout depends heavily on which lanes sit adjacent. A "bridge"
  // lane that shares events with multiple others should sit between them; if
  // it doesn't, its connecting segments traverse unrelated lanes and create
  // false visual association ("does this event belong to that lane too?").
  //
  // For each permutation of the lane order, we score the layout by counting
  // intervening non-participating lanes across all shared events. Lower is
  // better. Tiebreaker: drift from the original YAML order, so the author's
  // intent wins when crossing-cost is tied.
  //
  // Brute-force is fine up to 8 lanes (40K perms, ~1ms). Beyond that we keep
  // the YAML order — the subway-map metaphor breaks down anyway.
  const objects = useMemo(() => {
    if (rawObjects.length <= 2 || rawObjects.length > 8) return rawObjects;
    const idSet = new Set(rawObjects.map((o) => o.id));
    const sharedEvents = events
      .map((e) => e.objectIds.filter((id) => idSet.has(id)))
      .filter((ids) => ids.length >= 2);
    if (sharedEvents.length === 0) return rawObjects;

    const ids = rawObjects.map((o) => o.id);
    let bestScore = Infinity;
    let best: string[] = ids;

    const permute = (arr: string[], start: number) => {
      if (start === arr.length - 1) {
        const idx = new Map<string, number>();
        arr.forEach((id, i) => idx.set(id, i));
        let cost = 0;
        for (const evIds of sharedEvents) {
          const ixs = evIds.map((id) => idx.get(id)!).sort((a, b) => a - b);
          cost += ixs[ixs.length - 1] - ixs[0] + 1 - ixs.length;
        }
        let drift = 0;
        arr.forEach((id, newIdx) => {
          drift += Math.abs(newIdx - ids.indexOf(id));
        });
        const score = cost * 1000 + drift;
        if (score < bestScore) {
          bestScore = score;
          best = [...arr];
        }
        return;
      }
      for (let i = start; i < arr.length; i++) {
        [arr[start], arr[i]] = [arr[i], arr[start]];
        permute(arr, start + 1);
        [arr[start], arr[i]] = [arr[i], arr[start]];
      }
    };
    permute([...ids], 0);

    const lookup = new Map(rawObjects.map((o) => [o.id, o]));
    return best.map((id) => lookup.get(id)!);
  }, [rawObjects, events]);

  // Min/max parseable counts across all connections — drives the line-thickness scale.
  const countRange = useMemo(() => {
    const counts = connections
      .map((c) => parseCount(c.count))
      .filter((n): n is number => n !== null);
    if (counts.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [connections]);

  // Get display value for a connection based on the active KPI.
  //  - Time KPIs read the per-connection `throughputTime` from the YAML.
  //    If a connection doesn't have one, falls back to "—" (em dash).
  //  - Count KPIs render the connection's `count` verbatim.
  const getKpiValue = useCallback(
    (conn: { fromEventId: string; toEventId: string; count: string; throughputTime?: string }) => {
      if (isTimeKpi(kpiType)) {
        return conn.throughputTime ?? "—";
      }
      return conn.count;
    },
    [kpiType],
  );

  const layout = useMemo(() => {
    const objectColorMap = new Map<string, string>();
    const objectIndexMap = new Map<string, number>();
    objects.forEach((obj, idx) => {
      objectColorMap.set(obj.id, obj.color);
      objectIndexMap.set(obj.id, idx);
    });

    // Calculate base lane X positions for each object (fixed vertical lanes)
    const laneX = new Map<string, number>();
    objects.forEach((obj, idx) => {
      laneX.set(obj.id, LEFT_MARGIN + idx * LANE_SPACING);
    });

    // Cluster X helper — used in both the prediction pass (collision resolver)
    // and the layout pass. Geometric midpoint of participating lanes' natural
    // Xs, BUT shifted clear of any non-participating lane that would otherwise
    // sit at the cluster center. Without this, e.g. a shared event between
    // lane A and lane C (skipping lane B) lands its dots ON lane B — which
    // visually looks like B participates in the event.
    const NON_PARTICIPATING_LANE_BUFFER = 80;
    const computeClusterX = (relevantIds: string[]): number => {
      if (relevantIds.length === 0) return LEFT_MARGIN;
      if (relevantIds.length === 1) return laneX.get(relevantIds[0]) ?? LEFT_MARGIN;
      const xs = relevantIds.map((id) => laneX.get(id) ?? LEFT_MARGIN);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      let cx = (minX + maxX) / 2;
      const participatingSet = new Set(relevantIds);
      // Only consider non-participating lanes that fall STRICTLY between
      // the participating lanes — those are the ones the cluster could be
      // visually mistaken for. Lanes outside the [min,max] span don't
      // pass through the cluster's vertical column, so they're safe.
      const intervening = objects
        .filter((o) => !participatingSet.has(o.id))
        .map((o) => laneX.get(o.id) ?? LEFT_MARGIN)
        .filter((lx) => lx > minX && lx < maxX)
        .sort((a, b) => a - b);
      for (const lx of intervening) {
        if (Math.abs(lx - cx) < NON_PARTICIPATING_LANE_BUFFER) {
          // Shift cluster to whichever side of the offending lane has more
          // clearance from the participating lanes' bounds.
          const leftCx = lx - NON_PARTICIPATING_LANE_BUFFER;
          const rightCx = lx + NON_PARTICIPATING_LANE_BUFFER;
          const leftRoom = leftCx - minX;
          const rightRoom = maxX - rightCx;
          cx = rightRoom >= leftRoom ? rightCx : leftCx;
        }
      }
      return cx;
    };

    // Build event sequences per object following connections
    const objectSequences = new Map<string, string[]>();
    
    objects.forEach(obj => {
      const objConnections = connections.filter(c => c.objectId === obj.id);
      const objEvents = events.filter(e => e.objectIds.includes(obj.id));
      if (objEvents.length === 0) return;
      
      const targetEvents = new Set(objConnections.map(c => c.toEventId));
      const startEvents = objEvents.filter(e => !targetEvents.has(e.id));
      
      const sequence: string[] = [];
      const visited = new Set<string>();
      
      const buildSequence = (eventId: string) => {
        if (visited.has(eventId)) return;
        if (!objEvents.find(e => e.id === eventId)) return;
        visited.add(eventId);
        sequence.push(eventId);
        const outgoing = objConnections.filter(c => c.fromEventId === eventId);
        outgoing.forEach(conn => buildSequence(conn.toEventId));
      };
      
      if (startEvents.length > 0) {
        startEvents.forEach(e => buildSequence(e.id));
      } else if (objEvents.length > 0) {
        buildSequence(objEvents[0].id);
      }
      
      objEvents.forEach(e => {
        if (!visited.has(e.id)) sequence.push(e.id);
      });
      
      objectSequences.set(obj.id, sequence);
    });

    // Calculate unified Y positions based on dependency order
    // Events are positioned based on their connections - an event appears at the Y level
    // determined by its predecessors across ALL object lanes
    // Events with syncLevel are forced to that specific level for lane synchronization
    const eventUnifiedY = new Map<string, number>();
    
    // Include ALL events passed to the component, not just those in sequences
    const allEventIds = new Set<string>();
    events.forEach(evt => allEventIds.add(evt.id));
    // Also add events from sequences (for backward compatibility)
    objects.forEach(obj => {
      const seq = objectSequences.get(obj.id) || [];
      seq.forEach(id => allEventIds.add(id));
    });
    
    // Build a map of syncLevels from events
    const syncLevels = new Map<string, number>();
    events.forEach(evt => {
      if (evt.syncLevel !== undefined) {
        syncLevels.set(evt.id, evt.syncLevel);
      }
    });
    
    // Track which level each event is at (based on max predecessor level + 1)
    const eventLevel = new Map<string, number>();
    
    const getEventLevel = (eventId: string, visited: Set<string> = new Set()): number => {
      if (eventLevel.has(eventId)) return eventLevel.get(eventId)!;
      if (visited.has(eventId)) return 0; // Cycle detection
      visited.add(eventId);
      
      // If this event has a forced syncLevel, use it
      if (syncLevels.has(eventId)) {
        const level = syncLevels.get(eventId)!;
        eventLevel.set(eventId, level);
        return level;
      }
      
      // Find all predecessor events (from connections) - check ALL connections, not just those in allEventIds
      const predecessors = connections
        .filter(c => c.toEventId === eventId && c.fromEventId !== eventId)
        .map(c => c.fromEventId)
        .filter(id => allEventIds.has(id));
      
      if (predecessors.length === 0) {
        eventLevel.set(eventId, 0);
        return 0;
      }
      
      const maxPredLevel = Math.max(...predecessors.map(p => getEventLevel(p, visited)));
      const level = maxPredLevel + 1;
      eventLevel.set(eventId, level);
      return level;
    };
    
    // Calculate levels for all events
    allEventIds.forEach(eventId => {
      getEventLevel(eventId);
    });

    // ----- Card-collision resolver -----
    // Two events at the same level can produce the same card X when one is
    // solo on a middle lane and another is shared between outer lanes
    // (skipping that middle lane) — the midpoint cluster anchor lands
    // exactly on the middle lane's natural X. Result: cards stack.
    //
    // Detect any pair at the same level whose card-extent X-ranges overlap
    // and bump the LATER event (in initial level order) downward to the
    // first conflict-free level. Events are processed in level order so
    // dependencies (predecessor.level < successor.level) are preserved.
    {
      // Compute each event's preliminary card-center X (cluster mid for
      // shared events, lane.X for solo). This uses the SAME midpoint rule
      // the eventLayouts pass uses, so the prediction is accurate.
      const predictedCenterX = new Map<string, number>();
      events.forEach((evt) => {
        const relevant = evt.objectIds
          .filter((id) => objects.some((o) => o.id === id))
          .sort((a, b) => (objectIndexMap.get(a) || 0) - (objectIndexMap.get(b) || 0));
        if (relevant.length === 0) return;
        predictedCenterX.set(evt.id, computeClusterX(relevant));
      });

      // Approximate card extent: max card width (200) + dot offset (18)
      // + small buffer. Two events whose X-distance is below this collide.
      const COLLISION_BUFFER = 230;

      const occupiedAtLevel = new Map<number, number[]>();
      // Process events in initial-level order so a bumped event doesn't
      // collide with predecessors (which are placed first).
      const sortedEids = Array.from(allEventIds).sort(
        (a, b) => (eventLevel.get(a) ?? 0) - (eventLevel.get(b) ?? 0),
      );

      sortedEids.forEach((eid) => {
        const x = predictedCenterX.get(eid);
        if (x === undefined) return;
        let lvl = eventLevel.get(eid) ?? 0;
        // Try the current level; if any already-placed event is too close
        // in X, bump to the next level and re-check.
        // Cap iterations defensively at 50 to prevent any infinite loop.
        for (let attempts = 0; attempts < 50; attempts++) {
          const occupiedXs = occupiedAtLevel.get(lvl) ?? [];
          const collides = occupiedXs.some((other) => Math.abs(other - x) < COLLISION_BUFFER);
          if (!collides) break;
          lvl++;
        }
        eventLevel.set(eid, lvl);
        if (!occupiedAtLevel.has(lvl)) occupiedAtLevel.set(lvl, []);
        occupiedAtLevel.get(lvl)!.push(x);
      });
    }

    // ----- Per-lane deviation reserve (G4b/G7) -----
    // Right/left deviation cards sit SIDE_OFFSET(240) from their lane, but lanes
    // are only LANE_SPACING(250) apart — so dev cards land ON the neighbour lane
    // and cross its paths/cards. Reserve extra horizontal room: widen the gap to
    // a neighbour for any lane that carries a side deviation (reserve grows with
    // the stacked-layer count). Uses the FINAL eventLevel (post collision-
    // resolver) so the side precompute agrees with deviationLayout's
    // autoPickSide, and the FULL (un-sliced) reserve set so lane X is STABLE as
    // the slider reveals deviations one at a time. When no lane carries a side
    // deviation every reserve is 0 → laneX is byte-identical to the uniform
    // LEFT_MARGIN + idx*LANE_SPACING (happy-path pixel-stable).
    const reserveDevs = reserveDeviationEvents ?? deviationEvents;
    const reserveConns = reserveDeviationConnections ?? deviationConnections;
    if (reserveDevs.length > 0) {
      const RESERVE_SIDE_OFFSET = 240;     // mirror SIDE_OFFSET (deviationLayout)
      const RESERVE_COLLISION_STEP = 230;  // mirror COLLISION_STEP
      const RESERVE_CARD_CLEAR = CARD_WIDTH_MAX + 60;

      const reserveActiveRange = new Map<string, { min: number; max: number }>();
      objects.forEach((obj) => {
        const lv = events
          .filter((e) => e.objectIds.includes(obj.id))
          .map((e) => eventLevel.get(e.id) ?? 0);
        if (lv.length === 0) return;
        reserveActiveRange.set(obj.id, { min: Math.min(...lv), max: Math.max(...lv) });
      });
      // Mirror of deviationLayout.autoPickSide (operating on index + active
      // overlap). Keep in sync with that function.
      const pickSideForReserve = (
        objectId: string,
        forkLevel: number | undefined,
        mergeLevel: number | undefined,
      ): "left" | "right" => {
        const i = objects.findIndex((o) => o.id === objectId);
        if (i < 0) return "right";
        const devLo = Math.min(forkLevel ?? 0, mergeLevel ?? 0);
        const devHi = Math.max(forkLevel ?? 0, mergeLevel ?? 0);
        let aL = 0, aR = 0;
        objects.forEach((obj, otherIdx) => {
          if (otherIdx === i) return;
          const range = reserveActiveRange.get(obj.id);
          if (!range) return;
          if (!(range.min <= devHi && range.max >= devLo)) return;
          if (otherIdx < i) aL++; else aR++;
        });
        if (aL < aR) return "left";
        if (aR < aL) return "right";
        return "right";
      };
      // Deepest stacked-layer count per (lane, side).
      const layersRight = new Map<string, number>();
      const layersLeft = new Map<string, number>();
      const groupCount = new Map<string, number>();
      reserveDevs.forEach((dev) => {
        const inc = reserveConns.find((c) => c.to_event_id === dev.id);
        const out = reserveConns.find((c) => c.from_event_id === dev.id);
        const fLvl = inc ? eventLevel.get(inc.from_event_id) : undefined;
        const mLvl = out ? eventLevel.get(out.to_event_id) : undefined;
        const side = dev.side ?? pickSideForReserve(dev.object_id, fLvl, mLvl);
        const k = `${dev.object_id}|${side}|${fLvl ?? "?"}|${mLvl ?? "?"}`;
        const n = (groupCount.get(k) ?? 0) + 1;
        groupCount.set(k, n);
        const target = side === "right" ? layersRight : layersLeft;
        if ((target.get(dev.object_id) ?? 0) < n) target.set(dev.object_id, n);
      });
      const reserveFor = (m: Map<string, number>, objId: string): number => {
        const layers = m.get(objId) ?? 0;
        if (layers === 0) return 0;
        const reach = RESERVE_SIDE_OFFSET + (layers - 1) * RESERVE_COLLISION_STEP + RESERVE_CARD_CLEAR;
        return Math.max(0, reach - LANE_SPACING);
      };
      // Re-fill laneX with cumulative, per-gap (asymmetric) stride.
      let cursor = LEFT_MARGIN;
      objects.forEach((obj, i) => {
        if (i > 0) {
          const prev = objects[i - 1];
          cursor += LANE_SPACING + reserveFor(layersRight, prev.id) + reserveFor(layersLeft, obj.id);
        }
        laneX.set(obj.id, cursor);
      });
    }

    // Identify levels that introduce a new lane (an object that hadn't appeared
    // in any earlier event). When the first event of a new lane is a shared
    // event, the OTHER lane's preceding event needs extra Y above so the new
    // lane's start port + label has clear vertical room.
    //
    // Also track per-event which objects are being introduced — drives the
    // cluster anchor rule for shared events:
    //  • If the event introduces ≥1 new lane → cluster anchors at the
    //    RIGHTMOST introducing lane's x. New lane stays straight; existing
    //    lanes bend right to reach.
    //  • Else (all participating lanes already running) → cluster anchors at
    //    the LEFTMOST participating lane's x. Card stays on that side of the
    //    canvas, preserving the established visual flow.
    const newLaneIntroLevels = new Set<number>();
    const eventIntroObjects = new Map<string, Set<string>>();
    {
      const seenObjects = new Set<string>();
      // Walk events in level order
      const sortedEventIds = Array.from(allEventIds).sort(
        (a, b) => (eventLevel.get(a) || 0) - (eventLevel.get(b) || 0),
      );
      for (const eid of sortedEventIds) {
        const evt = events.find((e) => e.id === eid);
        if (!evt) continue;
        const level = eventLevel.get(eid) || 0;
        const introHere = new Set<string>();
        for (const oid of evt.objectIds) {
          if (!seenObjects.has(oid)) {
            introHere.add(oid);
          }
        }
        eventIntroObjects.set(eid, introHere);
        // Only count as "new lane intro" if other lanes were already in play
        if (introHere.size > 0 && seenObjects.size > 0) {
          newLaneIntroLevels.add(level);
        }
        evt.objectIds.forEach((id) => seenObjects.add(id));
      }
    }

    // Identify level transitions that host deviation events, AND track the
    // MAXIMUM number of stacked layers at each transition. Multiple
    // deviations on the same parent lane between the same fork+merge anchors
    // get stacked vertically (each layer sits 70px below the previous) to
    // keep their incoming/outgoing path horizontal segments at distinct Y —
    // satisfying the no-overlap-1:1 rule. The stack height grows the
    // required fork→merge gap accordingly.
    //
    // Per-level offset = baseDevOffset + (maxLayers - 1) * EVENT_LAYER_Y_STEP
    //   1 layer:  140 + 0   = 140  (preserves prior comfort spacing)
    //   2 layers: 140 + 80  = 220
    //   3 layers: 140 + 160 = 300
    const BASE_DEVIATION_OFFSET = 140;
    const EVENT_LAYER_Y_STEP = 80;
    const groupCounts = new Map<string, number>();
    const maxLayersPerLevel = new Map<number, number>();
    deviationEvents.forEach((dev) => {
      const incoming = deviationConnections.find((c) => c.to_event_id === dev.id);
      const outgoing = deviationConnections.find((c) => c.from_event_id === dev.id);
      const forkLevel = incoming ? eventLevel.get(incoming.from_event_id) : undefined;
      const mergeLevel = outgoing ? eventLevel.get(outgoing.to_event_id) : undefined;
      if (forkLevel === undefined || mergeLevel === undefined) return;
      const side = dev.side ?? "right"; // for grouping; auto-pick happens later — ok to use raw
      const groupKey = `${dev.object_id}|${side}|${forkLevel}|${mergeLevel}`;
      const layerIdx = groupCounts.get(groupKey) ?? 0;
      groupCounts.set(groupKey, layerIdx + 1);
      const lo = Math.min(forkLevel, mergeLevel);
      const hi = Math.max(forkLevel, mergeLevel);
      for (let l = lo + 1; l <= hi; l++) {
        const prev = maxLayersPerLevel.get(l) ?? 0;
        maxLayersPerLevel.set(l, Math.max(prev, layerIdx + 1));
      }
    });

    // Convert levels to Y positions, applying NEW_LANE_INTRO_OFFSET and
    // (per-level, layer-aware) deviation offset cumulatively for every
    // special level at-or-before this event's level.
    const levelToY = (level: number) => {
      let extra = 0;
      newLaneIntroLevels.forEach((introLevel) => {
        if (level >= introLevel) extra += NEW_LANE_INTRO_OFFSET;
      });
      maxLayersPerLevel.forEach((maxLayers, devLevel) => {
        if (level >= devLevel) {
          extra += BASE_DEVIATION_OFFSET + Math.max(0, maxLayers - 1) * EVENT_LAYER_Y_STEP;
        }
      });
      return TOP_PADDING + level * VERTICAL_GAP + extra;
    };

    allEventIds.forEach(eventId => {
      const level = eventLevel.get(eventId) || 0;
      eventUnifiedY.set(eventId, levelToY(level));
    });

    // For shared events, cluster dots together
    // Horizontal lines will connect from each participating lane to the cluster
    const SHARED_DOT_GAP = 26; // Gap between dot centers (creates ~6px visual gap between edges)
    
    interface EventLayout {
      event: ProcessEvent;
      y: number;
      isShared: boolean;
      isNonContiguous: boolean; // Track if shared event spans non-adjacent lanes
      dots: Array<{ objectId: string; x: number; color: string }>;
      clusterCenterX: number; // Center X position for the card
    }
    
    const eventLayouts = new Map<string, EventLayout>();

    events.forEach(event => {
      const y = eventUnifiedY.get(event.id);
      if (y === undefined) return;

      const relevantObjects = event.objectIds
        .filter(id => objects.some(o => o.id === id))
        .sort((a, b) => (objectIndexMap.get(a) || 0) - (objectIndexMap.get(b) || 0));

      if (relevantObjects.length === 0) return;

      const isShared = relevantObjects.length > 1;
      let dots: Array<{ objectId: string; x: number; color: string }>;
      let isNonContiguous = false;
      let clusterCenterX: number;

      if (isShared) {
        // Detect non-contiguous (lanes span non-adjacent indices) for
        // downstream consumers; anchor logic treats all cases the same.
        const indices = relevantObjects.map((id) => objectIndexMap.get(id) || 0);
        const minIdx = Math.min(...indices);
        const maxIdx = Math.max(...indices);
        isNonContiguous = (maxIdx - minIdx + 1) !== relevantObjects.length;

        // Cluster anchor rule (canonical):
        //   Lanes always run vertically at their natural X. At shared
        //   events, dots cluster TIGHTLY together centered at the MIDPOINT
        //   of participating lanes' natural Xs. Each lane bends INWARD
        //   from its natural column toward the cluster, contributing one
        //   dot. After the event, each lane returns to its natural X for
        //   subsequent (solo or shared) events.
        //
        //   This matches every canonical Celonis rendering observed:
        //   2 lanes converge to the midpoint between them; 3 lanes converge
        //   around the median lane; lanes return to natural columns for
        //   solo events. Consecutive shared events between the same lanes
        //   share the same cluster X, so the lane verticals between them
        //   are clean and parallel.
        //
        //   Dots are placed in natural-X order (leftmost first), tucked
        //   close together at SHARED_DOT_GAP intervals, centered on the
        //   midpoint so the cluster is symmetric around it.
        const midX = computeClusterX(relevantObjects);

        const sortedByNaturalX = [...relevantObjects].sort(
          (a, b) => (laneX.get(a) ?? 0) - (laneX.get(b) ?? 0),
        );
        const n = sortedByNaturalX.length;
        const startOffset = -((n - 1) / 2) * SHARED_DOT_GAP;

        const laneClusterIndex = new Map<string, number>();
        sortedByNaturalX.forEach((id, idx) => laneClusterIndex.set(id, idx));

        dots = relevantObjects.map((objId) => {
          const idx = laneClusterIndex.get(objId) ?? 0;
          return {
            objectId: objId,
            x: midX + startOffset + idx * SHARED_DOT_GAP,
            color: objectColorMap.get(objId) || '#64748b',
          };
        });

        const xs = dots.map((d) => d.x);
        clusterCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
      } else {
        // Single object — dot at its natural lane X. Lanes always return to
        // their natural X for solo events.
        const objId = relevantObjects[0];
        const objLaneX = laneX.get(objId) ?? LEFT_MARGIN;
        clusterCenterX = objLaneX;
        dots = [{
          objectId: objId,
          x: objLaneX,
          color: objectColorMap.get(objId) || '#64748b',
        }];
      }

      eventLayouts.set(event.id, { event, y, isShared, isNonContiguous, dots, clusterCenterX });
    });

    // Generate orthogonal path segments (vertical → horizontal → vertical) with smooth corners
    const pathSegments: Array<{
      d: string;
      color: string;
      objectId: string;
      fromEventId: string;
      toEventId: string;
      count: string;
      throughputTime?: string;
      labelX: number;
      labelY: number;
      arrowX: number;
      arrowY: number;
      bendY: number;
      isStraight: boolean;
    }> = [];

    // First pass: group connections by their from/to event pair to detect overlapping labels
    const connectionsByEventPair = new Map<string, ProcessConnection[]>();
    connections.forEach(conn => {
      const key = `${conn.fromEventId}-${conn.toEventId}`;
      if (!connectionsByEventPair.has(key)) {
        connectionsByEventPair.set(key, []);
      }
      connectionsByEventPair.get(key)!.push(conn);
    });

    connections.forEach(conn => {
      const objId = conn.objectId;
      if (!objects.some(o => o.id === objId)) return;
      
      const color = objectColorMap.get(objId) || '#64748b';
      const objIndex = objectIndexMap.get(objId) || 0;
      
      const fromLayout = eventLayouts.get(conn.fromEventId);
      const toLayout = eventLayouts.get(conn.toEventId);
      
      if (!fromLayout || !toLayout) return;
      
      const fromDot = fromLayout.dots.find(d => d.objectId === objId);
      const toDot = toLayout.dots.find(d => d.objectId === objId);
      
      if (!fromDot || !toDot) return;
      
      const startX = fromDot.x;
      const startY = fromLayout.y + NODE_RADIUS + 4;
      const endX = toDot.x;
      const endY = toLayout.y - NODE_RADIUS - 6;
      
      let d: string;
      const r = CORNER_RADIUS;
      const isStraight = Math.abs(startX - endX) < 2;

      // Default bend at the midpoint. But for multi-level skips (the path
      // jumps over one or more intermediate event rows), a midpoint bend
      // can land the horizontal segment at an intermediate card's Y — and
      // if that card's X range overlaps this path's horizontal X range,
      // the horizontal cuts through the card body. Detect that case and
      // route the bend into the first gutter just below the source dot
      // instead, where no cards live.
      let midY = (startY + endY) / 2;
      if (!isStraight) {
        const pathMinX = Math.min(startX, endX);
        const pathMaxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        const CARD_HALF_H = 26;
        const CARD_BUFFER = 6;
        for (const [otherId, otherLayout] of eventLayouts) {
          if (otherId === conn.fromEventId || otherId === conn.toEventId) continue;
          const oy = otherLayout.y;
          if (oy <= minY + CARD_HALF_H || oy >= maxY - CARD_HALF_H) continue;
          const otherRightmostDotX = Math.max(...otherLayout.dots.map((dt) => dt.x));
          const cardL = otherRightmostDotX + CARD_OFFSET;
          const cardR = cardL + CARD_WIDTH_MAX;
          if (cardR < pathMinX || cardL > pathMaxX) continue;
          if (Math.abs(midY - oy) < CARD_HALF_H + CARD_BUFFER) {
            // Card-row collision — bend in the gutter just below the source.
            midY = startY + 60;
            break;
          }
        }
      }

      if (isStraight) {
        // Straight vertical line (same lane)
        d = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        // Orthogonal path: down → horizontal → down.
        const goingRight = endX > startX;
        const dx = Math.abs(endX - startX);
        const effectiveR = Math.min(r, dx / 2, (endY - startY) / 4);

        if (goingRight) {
          d = `M ${startX} ${startY}
               L ${startX} ${midY - effectiveR}
               Q ${startX} ${midY} ${startX + effectiveR} ${midY}
               L ${endX - effectiveR} ${midY}
               Q ${endX} ${midY} ${endX} ${midY + effectiveR}
               L ${endX} ${endY}`;
        } else {
          d = `M ${startX} ${startY}
               L ${startX} ${midY - effectiveR}
               Q ${startX} ${midY} ${startX - effectiveR} ${midY}
               L ${endX + effectiveR} ${midY}
               Q ${endX} ${midY} ${endX} ${midY + effectiveR}
               L ${endX} ${endY}`;
        }
      }

      // Label sits at the bend Y so it lands on the horizontal portion of
      // the path. For straight vertical paths (no bend) we fall back to
      // the midpoint between source and dest.
      const baseMidY = isStraight ? (startY + endY) / 2 : midY;
      
      // Get all connections for this event pair to determine label positioning
      const pairKey = `${conn.fromEventId}-${conn.toEventId}`;
      const pairConnections = connectionsByEventPair.get(pairKey) || [conn];
      
      // Sort connections by their lane X position (left to right)
      const sortedPairConns = [...pairConnections].sort((a, b) => {
        const aLayout = eventLayouts.get(a.fromEventId);
        const bLayout = eventLayouts.get(b.fromEventId);
        const aDot = aLayout?.dots.find(d => d.objectId === a.objectId);
        const bDot = bLayout?.dots.find(d => d.objectId === b.objectId);
        return (aDot?.x || 0) - (bDot?.x || 0);
      });
      
      // Find this connection's position in the sorted list
      const posInPair = sortedPairConns.findIndex(c => c.objectId === objId);
      const totalInPair = sortedPairConns.length;
      
      let labelOnPathX: number;
      
      if (totalInPair === 1) {
        // Single connection: centre the pill on the horizontal mid-segment
        // (between the two dots) for orthogonal edges, so a fan-out from one
        // event doesn't cluster all its pills at the source. Straight verticals
        // keep the pill on the lane.
        labelOnPathX = isStraight ? startX : (startX + endX) / 2;
      } else {
        // Multiple connections: rightmost lane gets label ON the lane,
        // others get offset to the LEFT of their lane
        if (posInPair === totalInPair - 1) {
          // Rightmost lane - label on the lane
          labelOnPathX = startX;
        } else {
          // Not rightmost - offset to the LEFT
          labelOnPathX = startX - 50;
        }
      }
      
      pathSegments.push({
        d,
        color,
        objectId: objId,
        fromEventId: conn.fromEventId,
        toEventId: conn.toEventId,
        count: conn.count,
        throughputTime: conn.throughputTime,
        labelX: labelOnPathX,
        labelY: baseMidY,
        arrowX: endX,
        arrowY: endY,
        bendY: midY,
        isStraight,
      });
    });

    // ----- Edge-label collision resolver -----
    // Two pills can collide when they belong to DIFFERENT (from,to) pairs
    // (the in-pair offset rule above only handles same-pair siblings). Common
    // case: a fan-out from a shared event where each lane goes to a distinct
    // downstream event but at similar Y.
    //
    // Shifting strategy: each pill's default labelY = midY (at the bend, or
    // anywhere on a straight vertical). Connection paths run vertical from
    // startY → midY at startX, then bend horizontally to endX, then vertical
    // again at endX. The pill's labelX = startX, so to keep the pill ON the
    // path we can only shift labelY UP (toward startY) — never past midY,
    // because past midY the path is no longer at startX. For straight
    // verticals (startX === endX) the whole path is at startX and we can
    // shift either direction. We nudge up in PILL_HEIGHT+buffer steps until
    // clear or until the upper bound is reached.
    {
      const PILL_HEIGHT = 22;
      const Y_BUFFER = 4;
      const X_BUFFER = 6;
      const pillWidthFor = (s: { count: string; throughputTime?: string }) => {
        const len = Math.max(s.count.length, (s.throughputTime ?? "").length);
        return len * 6.5 + 30;
      };
      const pillBounds = pathSegments.map((seg) => {
        const fromY = eventLayouts.get(seg.fromEventId)?.y ?? 0;
        const toY = eventLayouts.get(seg.toEventId)?.y ?? 0;
        const startY = Math.min(fromY, toY) + NODE_RADIUS + 4;
        const endY = Math.max(fromY, toY) - NODE_RADIUS - 6;
        // For paths with a bend, the pill stays on the FIRST vertical (above
        // the bend at seg.bendY). For straight paths, the entire vertical is
        // fair game.
        return {
          minY: startY + PILL_HEIGHT / 2 + 2,
          maxY: seg.isStraight ? endY - PILL_HEIGHT / 2 - 2 : seg.bendY,
        };
      });
      for (let i = 0; i < pathSegments.length; i++) {
        const si = pathSegments[i];
        const wi = pillWidthFor(si);
        for (let attempts = 0; attempts < 12; attempts++) {
          let collided = false;
          for (let j = 0; j < i; j++) {
            const sj = pathSegments[j];
            const wj = pillWidthFor(sj);
            const dx = Math.abs(si.labelX - sj.labelX);
            const dy = Math.abs(si.labelY - sj.labelY);
            if (dx < (wi + wj) / 2 + X_BUFFER && dy < PILL_HEIGHT + Y_BUFFER) {
              collided = true;
              const step = PILL_HEIGHT + Y_BUFFER;
              const upY = si.labelY - step;
              if (upY >= pillBounds[i].minY) {
                si.labelY = upY;
              } else {
                // Out of room upward — leave at last position; downward
                // shifting would take it off the path.
                attempts = 999;
              }
              break;
            }
          }
          if (!collided) break;
        }
      }

      // ----- Pill-vs-card avoidance (feedback G4) -----
      // A pill anchored on its lane's vertical can still land on top of an
      // event card — its own lane's card (which sits to the RIGHT of the dot)
      // or a neighbouring lane's. Shift the pill UP (toward its source) in
      // PILL_HEIGHT steps until it clears every card, bounded by pillBounds so
      // it never leaves the path's first vertical. The pill's own endpoint
      // cards are ignored (shifting up would just chase its own from-card).
      const cardRects = Array.from(eventLayouts.values()).map((el) => {
        const rightmostDotX = Math.max(...el.dots.map((dt) => dt.x));
        const w = computeCardWidth(
          el.event.label,
          el.event.count,
          el.event.eventCount ?? el.event.count,
        );
        const left = rightmostDotX + CARD_OFFSET;
        return { fromId: el.event.id, left, right: left + w, top: el.y - 26, bottom: el.y + 26 };
      });
      for (let i = 0; i < pathSegments.length; i++) {
        const si = pathSegments[i];
        const wi = pillWidthFor(si);
        for (let attempts = 0; attempts < 12; attempts++) {
          const pillL = si.labelX - wi / 2;
          const pillR = si.labelX + wi / 2;
          const pillT = si.labelY - PILL_HEIGHT / 2;
          const pillB = si.labelY + PILL_HEIGHT / 2;
          const hit = cardRects.find(
            (c) =>
              c.fromId !== si.fromEventId &&
              c.fromId !== si.toEventId &&
              pillL < c.right + X_BUFFER &&
              pillR > c.left - X_BUFFER &&
              pillT < c.bottom + Y_BUFFER &&
              pillB > c.top - Y_BUFFER,
          );
          if (!hit) break;
          const upY = si.labelY - (PILL_HEIGHT + Y_BUFFER);
          if (upY >= pillBounds[i].minY) {
            si.labelY = upY;
          } else {
            break; // out of room; best effort
          }
        }
      }
    }

    // Object labels and terminal segments (not full-height lane lines).
    // `x` / `y` / `startY` anchor the head circle + label group at the lane's
    // NATURAL X (matches real Celonis lane-start). `stubD` is the SVG path for
    // the lane's initial segment from head → first event dot. For solo first
    // events it's a straight vertical; for shared first events it's an L-shape
    // that bends near the bottom (just above the dot) to enter the cluster.
    const objectStartLabels: Array<{
      obj: ProcessObject;
      x: number;
      y: number;
      startY: number;
      stubD: string;
      stubCount: string;
      stubLabelX: number;
      stubLabelY: number;
    }> = [];
    const objectTerminalPaths: Array<{ obj: ProcessObject; d: string; endX: number; endY: number }> = [];

    // Join segments for objects that appear in shared events without explicit connections
    const laneJoinSegments: Array<{
      d: string;
      color: string;
      objectId: string;
      eventId: string;
    }> = [];

    // Lanes terminate AT their last event's port dot — no overshoot stub and
    // no separate end-dot below it. A trailing stub read as the lane
    // "continuing" past the final activity (feedback G1); real Celonis ends
    // the lane line at the last activity node. `objectTerminalPaths` is kept
    // (empty) for the layout return shape but no longer populated/rendered.
    objects.forEach(obj => {
      const objLaneX = laneX.get(obj.id) || LEFT_MARGIN;

      // Find ALL events this object participates in (not just sequence)
      const objEventIds = events
        .filter(e => e.objectIds.includes(obj.id))
        .map(e => e.id);

      if (objEventIds.length === 0) return;

      // Find the min and max Y positions across all events this object participates in
      const objEventYs = objEventIds
        .map(id => eventUnifiedY.get(id))
        .filter((y): y is number => y !== undefined);

      if (objEventYs.length === 0) return;

      const firstEventY = Math.min(...objEventYs);

      // First event's dot for THIS object. The head label + circle anchor at
      // the lane's NATURAL X (matches real Celonis). The stub then descends
      // most of the way at natural X and bends horizontally just above the
      // dot to enter the cluster — this keeps lane labels clear of cluster
      // traffic from neighboring lanes.
      const firstEventId = objEventIds.find(id => eventUnifiedY.get(id) === firstEventY);
      const firstEventLayout = firstEventId ? eventLayouts.get(firstEventId) : null;
      const firstDot = firstEventLayout?.dots.find(d => d.objectId === obj.id);
      const dotX = firstDot?.x ?? objLaneX;

      // Lane head label sits well ABOVE the event so that (a) the stub's
      // horizontal bend has clearance from the event card top (cardHeight=52
      // centered on event Y → top edge at firstEventY-26), and (b) connection
      // bends from previous events route ABOVE the lane head label band.
      const objStartLabelY = firstEventY - 100;
      const objLaneStartY = firstEventY - 80;

      // Stub path: from (laneX, laneStartY) down to the dot. Solo first event
      // → straight vertical at laneX. Shared first event with cluster offset
      // → L-shape; bend sits well above the card top and below the head label.
      const stubEndY = firstEventY - NODE_RADIUS - 4;
      let stubD: string;
      if (Math.abs(objLaneX - dotX) < 2) {
        stubD = `M ${objLaneX} ${objLaneStartY} L ${dotX} ${stubEndY}`;
      } else {
        const bendY = firstEventY - 60;
        const dx = Math.abs(dotX - objLaneX);
        const r = Math.min(CORNER_RADIUS, dx / 2, (stubEndY - objLaneStartY) / 4);
        const goingRight = dotX > objLaneX;
        stubD = goingRight
          ? `M ${objLaneX} ${objLaneStartY}
             L ${objLaneX} ${bendY - r}
             Q ${objLaneX} ${bendY} ${objLaneX + r} ${bendY}
             L ${dotX - r} ${bendY}
             Q ${dotX} ${bendY} ${dotX} ${bendY + r}
             L ${dotX} ${stubEndY}`
          : `M ${objLaneX} ${objLaneStartY}
             L ${objLaneX} ${bendY - r}
             Q ${objLaneX} ${bendY} ${objLaneX - r} ${bendY}
             L ${dotX + r} ${bendY}
             Q ${dotX} ${bendY} ${dotX} ${bendY + r}
             L ${dotX} ${stubEndY}`;
      }

      // Stub count pill: shown only when the stub bends (otherwise the lane
      // head's own count badge in the label group already carries the volume).
      // Sits on the vertical portion at lane's natural X, ~20px above the bend.
      const stubCount = obj.count;
      const stubLabelX = objLaneX;
      const stubLabelY = firstEventY - 80;

      objectStartLabels.push({
        obj,
        x: objLaneX,
        y: objStartLabelY,
        startY: objLaneStartY,
        stubD,
        stubCount,
        stubLabelX,
        stubLabelY,
      });
      
      // No terminal stub / end-dot: the lane ends at its last event's port dot
      // (see note above).

      // Lane-join segments are NOT generated. The start label/start segment
      // is anchored at the FIRST DOT's X (cluster X if the first event is
      // shared), so the lane visually originates at the cluster directly —
      // no need for a separate horizontal connector from natural laneX.
      // Drawing one would create a redundant stub vertical at natural X
      // peeking out behind the first-event card.
      //
      // Subsequent shared-event bends are handled by the connection paths
      // (which run from previous dot.x to current dot.x), so they don't
      // need join segments either.
    });

    return {
      eventLayouts,
      objectColorMap,
      pathSegments,
      objectStartLabels,
      objectTerminalPaths,
      laneJoinSegments,
      eventUnifiedY,
      eventLevel,
      laneX,
      objectColorMapForDevs: objectColorMap,
    };
  }, [objects, events, connections, deviationEvents, deviationConnections, reserveDeviationEvents, reserveDeviationConnections]);

  // ---------- Deviation layout ----------
  // Deviation events are placed beside their parent lane at the vertical
  // midpoint between their first incoming and first outgoing edge. Their
  // connections (forward skips, backward rework loops, and the edges that
  // anchor a deviation event into the main flow) are routed as standalone
  // orthogonal paths in a separate render pass. The main `layout` above is
  // unchanged when no deviations are active — happy path stays pixel-stable.
  const deviationLayout = useMemo(() => {
    // px from parent lane to the deviation event's dot. Must be greater than
    // CARD_WIDTH_MAX (200) + DEV_CARD_OFFSET (18) + buffer so a side:right
    // deviation's dot clears the parent lane's main-event card right edge.
    // Symmetrically for side:left so the deviation card's right edge clears
    // the parent lane vertical without overlapping a left-side card.
    const SIDE_OFFSET = 240;
    const DEV_CARD_OFFSET = 18; // px between dev event dot and its card

    type DevEventLayout = {
      input: DeviationEventInput;
      x: number;
      y: number;
      color: string;
      cardWidth: number;
      cardX: number; // x of the card's left edge
      cardSide: "left" | "right";
    };

    const devEvents: DevEventLayout[] = [];
    const devEventCoords = new Map<string, { x: number; y: number; color: string; layerIndex: number; side: "left" | "right" }>();

    // Auto-pick side based on which neighbouring lanes are ACTIVE at the
    // deviation's vertical range. A lane is only a crossing-risk if its own
    // active level range overlaps the deviation's. Lanes that terminated
    // above (e.g. engineering-change at level 4) or haven't started yet
    // (e.g. component-receipt before level 5) are invisible at the
    // deviation's Y and can't be crossed.
    //
    // Ground rule: lane crossings in the happy path are forbidden (see
    // feedback_pe_no_lane_crossings.md). The renderer routes deviations
    // into the side with fewer ACTIVE neighbouring lanes; ties default
    // right. Author's explicit `side` always wins.
    const laneActiveRange = new Map<string, { min: number; max: number }>();
    objects.forEach((obj) => {
      const objEventLevels = events
        .filter((e) => e.objectIds.includes(obj.id))
        .map((e) => layout.eventLevel.get(e.id) ?? 0);
      if (objEventLevels.length === 0) return;
      laneActiveRange.set(obj.id, {
        min: Math.min(...objEventLevels),
        max: Math.max(...objEventLevels),
      });
    });
    const autoPickSide = (
      objectId: string,
      forkLevel: number | undefined,
      mergeLevel: number | undefined,
    ): "left" | "right" => {
      const idx = objects.findIndex((o) => o.id === objectId);
      if (idx < 0) return "right";
      const devLo = Math.min(forkLevel ?? 0, mergeLevel ?? 0);
      const devHi = Math.max(forkLevel ?? 0, mergeLevel ?? 0);
      let activeLeft = 0;
      let activeRight = 0;
      objects.forEach((obj, otherIdx) => {
        if (otherIdx === idx) return;
        const range = laneActiveRange.get(obj.id);
        if (!range) return;
        // Lane is active at deviation's Y range if its level range
        // overlaps with [devLo, devHi].
        const overlaps = range.min <= devHi && range.max >= devLo;
        if (!overlaps) return;
        if (otherIdx < idx) activeLeft++;
        else activeRight++;
      });
      // Crossing-count preference (lower active-neighbour count wins).
      let pick: "left" | "right" =
        activeLeft < activeRight ? "left"
        : activeRight < activeLeft ? "right"
        : "right";
      // Room guard (B6-1): the dev sits SIDE_OFFSET from the lane, but lanes are
      // only LANE_SPACING apart — on a non-leftmost focal lane the fewer-
      // crossings side can place the dev ON the neighbour lane. With the G4b
      // reserve the chosen side is widened, so this guard usually finds room;
      // if the picked side has none and the other does, flip.
      const ROOM_NEEDED = SIDE_OFFSET + CARD_WIDTH_MAX / 2;
      const hasRoom = (dir: "left" | "right"): boolean => {
        const neighbourIdx = dir === "left" ? idx - 1 : idx + 1;
        if (neighbourIdx < 0 || neighbourIdx >= objects.length) return true;
        const myX = layout.laneX.get(objectId) ?? LEFT_MARGIN;
        const nX = layout.laneX.get(objects[neighbourIdx].id) ?? LEFT_MARGIN;
        return Math.abs(nX - myX) >= ROOM_NEEDED;
      };
      if (!hasRoom(pick) && hasRoom(pick === "left" ? "right" : "left")) {
        pick = pick === "left" ? "right" : "left";
      }
      return pick;
    };

    // Two deviation events on the same parent lane between the same fork+merge
    // anchors land at the SAME (x, y) by default. Track groups by
    // `${parent_lane}|${side}|${fork_level}|${merge_level}` and stack
    // subsequent events outward by COLLISION_STEP per layer. This guarantees
    // event cards never overlap horizontally — the canvas grows outward to
    // make room.
    const COLLISION_STEP = 230; // ≈ max card width (200) + gap (30)
    const layerMap = new Map<string, number>();

    // Pre-pass: count deviation events per (lane, side, anchor-pair) group so
    // the main pass can CENTER each stack on the fork→merge midpoint instead of
    // stacking only downward. Centering keeps every stacked deviation BETWEEN
    // its fork and merge, so each merge edge stays a forward (downward) clean
    // vertical approach to the merge dot — instead of the lowest layers dropping
    // below the merge and routing back UP as a spine whose long horizontal
    // sweeps across the merge event's card (feedback M1 + M2). Mirrors the
    // exact groupKey of the placement pass.
    const groupSizes = new Map<string, number>();
    deviationEvents.forEach((dev) => {
      const inc = deviationConnections.find((c) => c.to_event_id === dev.id);
      const out = deviationConnections.find((c) => c.from_event_id === dev.id);
      const fLvl = inc ? layout.eventLevel.get(inc.from_event_id) : undefined;
      const mLvl = out ? layout.eventLevel.get(out.to_event_id) : undefined;
      const s = dev.side ?? autoPickSide(dev.object_id, fLvl, mLvl);
      const key = `${dev.object_id}|${s}|${fLvl ?? "?"}|${mLvl ?? "?"}`;
      groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
    });

    deviationEvents.forEach((dev) => {
      const parentX = layout.laneX.get(dev.object_id) ?? LEFT_MARGIN;
      const parentColor = layout.objectColorMap.get(dev.object_id) ?? "#64748b";

      // Find anchor events from the deviation's connections
      const incoming = deviationConnections.find((c) => c.to_event_id === dev.id);
      const outgoing = deviationConnections.find((c) => c.from_event_id === dev.id);
      const forkLevel = incoming ? layout.eventLevel.get(incoming.from_event_id) : undefined;
      const mergeLevel = outgoing ? layout.eventLevel.get(outgoing.to_event_id) : undefined;

      // G8: a terminal/dangling deviation forks off the flow but never merges
      // back (no outgoing edge). Without a merge anchor it would land at the
      // fork's own Y, making the incoming edge degenerate (toY == fromY → mis-
      // classified as backward and routed as a broken spine). Drop it below the
      // fork so the incoming edge is an unambiguous forward (down) approach.
      const isTerminalDev = !!incoming && !outgoing;
      const TERMINAL_DEV_DROP = 165; // ~50% longer so the node + its pill clear the fork's pills

      const side: "left" | "right" = dev.side ?? autoPickSide(dev.object_id, forkLevel, mergeLevel);

      // Compute the layer index within this (lane, side, anchor-pair) group.
      // Layer 0 = closest to the lane; layers stack outward.
      const groupKey = `${dev.object_id}|${side}|${forkLevel ?? "?"}|${mergeLevel ?? "?"}`;
      const layerIndex = layerMap.get(groupKey) ?? 0;
      layerMap.set(groupKey, layerIndex + 1);

      const anchorIds = [incoming?.from_event_id, outgoing?.to_event_id].filter(
        (v): v is string => !!v,
      );
      const anchorYs = anchorIds
        .map((id) => layout.eventUnifiedY.get(id))
        .filter((v): v is number => v !== undefined);
      // Base midpoint between fork and merge anchor Ys.
      const baseY = anchorYs.length > 0
        ? anchorYs.reduce((a, b) => a + b, 0) / anchorYs.length
        : TOP_PADDING + 200;
      // Layer Y stagger — each subsequent deviation in the same group sits
      // EVENT_LAYER_Y_STEP px below the previous one. This guarantees their
      // path horizontal segments land at distinct Y values, so no two paths
      // overlap 1:1 (the trace rule). Bigger stagger than card height (52)
      // keeps the cards themselves clear of each other vertically.
      const EVENT_LAYER_Y_STEP_LOCAL = 80;
      const groupSize = groupSizes.get(groupKey) ?? 1;
      // G8: a terminal dev aligns with the fork's NEXT-LEVEL siblings (e.g.
      // Cancel Order at the same height as Ship Order / Pick Item) — the Celonis
      // "sibling outcome" layout — rather than a fixed drop. Falls back to a
      // fixed drop if there's no next-level main event.
      let terminalY: number | undefined;
      if (isTerminalDev && forkLevel !== undefined) {
        for (const [eid, lv] of layout.eventLevel.entries()) {
          if (lv === forkLevel + 1) {
            const yy = layout.eventUnifiedY.get(eid);
            if (yy !== undefined) { terminalY = yy; break; }
          }
        }
      }
      // Center the stack on baseY: offsets symmetric around 0, so a single
      // deviation lands exactly on baseY (unchanged) and N deviations span
      // ±((N-1)/2)·step around the fork→merge midpoint.
      const y = isTerminalDev
        ? (terminalY ?? baseY + TERMINAL_DEV_DROP)
        : baseY + (layerIndex - (groupSize - 1) / 2) * EVENT_LAYER_Y_STEP_LOCAL;

      const totalOffset = SIDE_OFFSET + layerIndex * COLLISION_STEP;
      // G8: a terminal dev off a SHARED fork (its lane dot is tucked into a
      // cluster, off the lane's natural X) drops STRAIGHT below that dot — a
      // clean vertical edge with no side bump. Off a non-shared fork keep the
      // side offset (straight-below would collide with the lane's own next
      // event).
      const forkDotX = incoming
        ? layout.eventLayouts.get(incoming.from_event_id)?.dots.find((d) => d.objectId === dev.object_id)?.x
        : undefined;
      const x =
        isTerminalDev && forkDotX !== undefined && Math.abs(forkDotX - parentX) > 2
          ? forkDotX
          : side === "right" ? parentX + totalOffset : parentX - totalOffset;
      const cardWidth = computeCardWidth(dev.label, dev.event_count, dev.event_count);
      const cardX = side === "right" ? x + DEV_CARD_OFFSET : x - DEV_CARD_OFFSET - cardWidth;

      const item: DevEventLayout = {
        input: dev,
        x,
        y,
        color: parentColor,
        cardWidth,
        cardX,
        cardSide: side,
      };
      devEvents.push(item);
      devEventCoords.set(dev.id, { x, y, color: parentColor, layerIndex, side });
    });

    // Resolve a from/to event id to its (x, y, color) — main events get their
    // canonical coords from the main layout; deviation events from the map
    // we just built.
    const resolveAnchor = (eventId: string): { x: number; y: number; color: string } | null => {
      const devCoord = devEventCoords.get(eventId);
      if (devCoord) return devCoord;
      const mainY = layout.eventUnifiedY.get(eventId);
      if (mainY === undefined) return null;
      // Main-event x: use the main event's lane (we look up the connection's
      // own object_id at call site so we route on the correct lane column).
      return { x: 0, y: mainY, color: "#64748b" };
    };

    type DevPath = {
      d: string;
      color: string;
      bundleKey: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      labelX: number;
      labelY: number;
      count?: string;
      throughputTime?: string;
      isBackward: boolean;
      /** Which edge of the target dot the arrowhead points into. "down" =
       *  approached from above (default, the generic case). "up" = approached
       *  from below — used by the loop-back spine that runs straight THROUGH
       *  a deviation node. */
      endDir: "down" | "up";
      connId: { from: string; to: string; objectId: string };
      key: string;
    };

    const devPaths: DevPath[] = [];

    // Track layer per (fork event, side) — paths leaving the same fork dot
    // on the same side get sequential tracks so their vertical exit segments
    // don't share an X. (Paths arriving at the same merge are NOT
    // separately tracked here; if multiple deviations terminate at the same
    // main dot they may share an approach track — accepted for now.)
    const forkSideTrackCounts = new Map<string, number>();
    // Detour-layer counter for backward edges — each backward edge on the
    // same lane gets a progressively further-left detourX so multiple
    // rework loops fan out instead of overlapping 1:1.
    const backwardDetourCounts = new Map<string, number>();

    deviationConnections.forEach((conn, idx) => {
      const fromCoord = resolveAnchor(conn.from_event_id);
      const toCoord = resolveAnchor(conn.to_event_id);
      if (!fromCoord || !toCoord) return;

      const laneXForObj = layout.laneX.get(conn.object_id) ?? LEFT_MARGIN;
      // Resolve the per-object dot X for a main event. For shared events the
      // cluster anchor rule offsets dots by SHARED_DOT_GAP from the anchor
      // lane — they are NOT at the participating object's lane X. Look up
      // the actual dot in eventLayouts; fall back to the lane X if the event
      // isn't shared (single-dot lane events).
      const mainEventDotX = (eventId: string): number => {
        const el = layout.eventLayouts.get(eventId);
        if (!el) return laneXForObj;
        const dot = el.dots.find((d) => d.objectId === conn.object_id);
        return dot ? dot.x : laneXForObj;
      };
      // For main events, the x snaps to the actual rendered dot for the
      // connection's object (handles shared-event clusters correctly).
      const fromX = devEventCoords.has(conn.from_event_id)
        ? fromCoord.x
        : mainEventDotX(conn.from_event_id);
      const toX = devEventCoords.has(conn.to_event_id)
        ? toCoord.x
        : mainEventDotX(conn.to_event_id);
      const fromY = fromCoord.y;
      const toY = toCoord.y;
      const color = layout.objectColorMap.get(conn.object_id) ?? "#64748b";

      const isBackward = toY <= fromY;
      // A forward "skip" connection-deviation joins two MAIN events on the
      // same lane more than one level apart (e.g. the maverick "send PO
      // without release" path). Drawn as a straight vertical it sits exactly
      // on the happy-path lane (invisible) and cuts through the intermediate
      // event card. We bow it outward instead — feedback G3.
      const fromIsMain = !devEventCoords.has(conn.from_event_id);
      const toIsMain = !devEventCoords.has(conn.to_event_id);
      const fromLvl = layout.eventLevel.get(conn.from_event_id);
      const toLvl = layout.eventLevel.get(conn.to_event_id);
      const isForwardSkip =
        !isBackward &&
        fromIsMain &&
        toIsMain &&
        fromLvl !== undefined &&
        toLvl !== undefined &&
        toLvl - fromLvl > 1;
      let d: string;
      let labelX: number;
      let labelY: number;
      let endDir: "down" | "up" = "down";

      // Track-offset rule (no two paths share a vertical or horizontal line):
      // each deviation path runs on its own "track" displaced 12px per layer
      // from the lane it touches. Layer 0 is at +12 so even a single
      // deviation sits visibly off the main lane vertical.
      //
      // Track layer is assigned per (fork event, side) — paths leaving the
      // same fork dot on the same side get distinct tracks regardless of
      // where they're heading. This is the lower-risk variant that handles
      // the common case (multiple deviations branching off one main event).
      const TRACK_STEP = 12;
      const fromDev = devEventCoords.get(conn.from_event_id);
      const toDev = devEventCoords.get(conn.to_event_id);
      // Track direction = the deviation event's side. For connection-only
      // edges (both endpoints main), default right.
      const trackSide: "left" | "right" = (fromDev?.side ?? toDev?.side) ?? "right";
      const trackSign = trackSide === "right" ? 1 : -1;
      const trackKey = `${conn.from_event_id}|${trackSide}`;
      const trackLayer = forkSideTrackCounts.get(trackKey) ?? 0;
      forkSideTrackCounts.set(trackKey, trackLayer + 1);
      const trackOffset = (trackLayer + 1) * TRACK_STEP * trackSign;
      // Apply offset only on ends that touch a MAIN lane (a deviation event
      // is already off-lane, so its dot doesn't need a track offset).
      const fromTrackX = fromDev ? fromX : fromX + trackOffset;
      const toTrackX = toDev ? toX : toX + trackOffset;

      if (!isBackward) {
        // Forward: orthogonal step path through midpoint, on the layer's
        // dedicated track. Diagonal kink at start and/or end where the path
        // touches a main lane dot, so the bulk of the vertical sits on the
        // track (away from the lane vertical).
        labelY = (fromY + toY) / 2;
        if (isForwardSkip) {
          // Same-lane skip → bow LEFT of the lane so it reads as a distinct
          // branch and clears the intermediate event card (cards sit to the
          // RIGHT of the lane). 80px left keeps clear of the left neighbour
          // lane (LANE_SPACING 250). Backward-compatible: only forward
          // multi-level same-lane skips take this path.
          const R = CORNER_RADIUS;
          const bowX = Math.min(fromX, toX) - 80;
          d = `M ${fromX} ${fromY + NODE_RADIUS + 2}` +
              ` L ${fromX} ${fromY + 40}` +
              ` Q ${fromX} ${fromY + 60} ${fromX - R} ${fromY + 60}` +
              ` L ${bowX + R} ${fromY + 60}` +
              ` Q ${bowX} ${fromY + 60} ${bowX} ${fromY + 60 + R}` +
              ` L ${bowX} ${toY - 60 - R}` +
              ` Q ${bowX} ${toY - 60} ${bowX + R} ${toY - 60}` +
              ` L ${toX - R} ${toY - 60}` +
              ` Q ${toX} ${toY - 60} ${toX} ${toY - 40}` +
              ` L ${toX} ${toY - NODE_RADIUS - 2}`;
          labelX = bowX;
        } else if (Math.abs(fromX - toX) < 1) {
          // Same column, adjacent — straight vertical
          d = `M ${fromX} ${fromY + NODE_RADIUS + 2} L ${toX} ${toY - NODE_RADIUS - 2}`;
          labelX = fromX;
        } else {
          // Strictly orthogonal (G9): vertical out of the from-dot to a channel
          // just below it, horizontal across to the target column, vertical into
          // the to-dot — rounded corners, NO diagonal kinks. The channel sits
          // near the fork so the long run is the OFF-LANE vertical at toX
          // (visible, clear of the happy-path lane vertical). This mirrors the
          // happy-path edge primitive.
          const startY = fromY + NODE_RADIUS + 2;
          const endY = toY - NODE_RADIUS - 2;
          const channelY = Math.min(startY + 28, (fromY + toY) / 2);
          const s = toX >= fromX ? 1 : -1;
          const r = Math.max(2, Math.min(
            CORNER_RADIUS,
            Math.abs(toX - fromX) / 2,
            channelY - startY,
            endY - channelY,
          ));
          d = `M ${fromX} ${startY}` +
              ` L ${fromX} ${channelY - r}` +
              ` Q ${fromX} ${channelY} ${fromX + s * r} ${channelY}` +
              ` L ${toX - s * r} ${channelY}` +
              ` Q ${toX} ${channelY} ${toX} ${channelY + r}` +
              ` L ${toX} ${endY}`;
          if (toDev) {
            // Edge ends AT a dev node (e.g. a terminal drop): the long run is
            // the off-lane vertical at toX — centre the pill on it, away from
            // the fork's pills.
            labelX = toX;
            labelY = (channelY + endY) / 2;
          } else {
            // Merge into a main event: pill on the horizontal channel.
            labelX = (fromX + toX) / 2;
            labelY = channelY;
          }
        }
      } else if ((!!fromDev) !== (!!toDev)) {
        // Backward edge with EXACTLY ONE end on a deviation node (the
        // canonical rework loop: main → dev → main, where the dev node sits
        // vertically between its fork and merge anchors). Route the vertical
        // as a single SPINE at the dev node's x so the dot sits directly ON
        // the line — the loop reads as one straight vertical THROUGH the
        // node, not a path bowing around it. Elbow only at the MAIN-lane end;
        // the dev end enters/exits the dot as a clean vertical. The two
        // halves (main→dev and dev→main) share the spine x, so together they
        // form one continuous line through the dot.
        const devC = (fromDev ?? toDev)!;
        const spineX = devC.x;
        if (toDev) {
          // main (from, below) → dev (to, above): exit the TOP of the main
          // dot, elbow horizontally onto the spine, straight up into the
          // BOTTOM of the dev dot.
          const sgn = fromX >= spineX ? 1 : -1;
          d = `M ${fromX} ${fromY - NODE_RADIUS - 2}` +
              ` L ${fromX} ${fromY - 40}` +
              ` Q ${fromX} ${fromY - 60} ${fromX - sgn * CORNER_RADIUS} ${fromY - 60}` +
              ` L ${spineX + sgn * CORNER_RADIUS} ${fromY - 60}` +
              ` Q ${spineX} ${fromY - 60} ${spineX} ${fromY - 60 - CORNER_RADIUS}` +
              ` L ${spineX} ${toY + NODE_RADIUS + 2}`;
        } else {
          // dev (from, below) → main (to, above): exit the TOP of the dev
          // dot, straight up the spine, elbow horizontally into the BOTTOM
          // of the main dot.
          const sgn = toX >= spineX ? 1 : -1;
          d = `M ${spineX} ${fromY - NODE_RADIUS - 2}` +
              ` L ${spineX} ${toY + 60 + CORNER_RADIUS}` +
              ` Q ${spineX} ${toY + 60} ${spineX + sgn * CORNER_RADIUS} ${toY + 60}` +
              ` L ${toX - sgn * CORNER_RADIUS} ${toY + 60}` +
              ` Q ${toX} ${toY + 60} ${toX} ${toY + 40}` +
              ` L ${toX} ${toY + NODE_RADIUS + 2}`;
        }
        endDir = "up"; // both spine variants approach the target from below
        labelX = spineX;
        labelY = (fromY + toY) / 2;
      } else {
        // Generic backward U-curve (main→main rework, or dev→dev): out to the
        // LEFT of both lanes, up past the from level, and back in.
        // Lane-crossings are accepted. Each subsequent backward edge on the
        // same lane detours further out so the loops fan out left-to-right
        // instead of overlapping.
        const detourLayerKey = conn.object_id;
        const detourLayer = backwardDetourCounts.get(detourLayerKey) ?? 0;
        backwardDetourCounts.set(detourLayerKey, detourLayer + 1);
        const detourX = Math.min(fromX, toX) - 100 - detourLayer * 40;
        d = `M ${fromX} ${fromY + NODE_RADIUS + 2}` +
            ` L ${fromX} ${fromY + 40}` +
            ` Q ${fromX} ${fromY + 60} ${fromX - CORNER_RADIUS} ${fromY + 60}` +
            ` L ${detourX + CORNER_RADIUS} ${fromY + 60}` +
            ` Q ${detourX} ${fromY + 60} ${detourX} ${fromY + 40}` +
            ` L ${detourX} ${toY - 40}` +
            ` Q ${detourX} ${toY - 60} ${detourX + CORNER_RADIUS} ${toY - 60}` +
            ` L ${toX - CORNER_RADIUS} ${toY - 60}` +
            ` Q ${toX} ${toY - 60} ${toX} ${toY - 40}` +
            ` L ${toX} ${toY - NODE_RADIUS - 2}`;
        labelX = detourX;
        labelY = (fromY + toY) / 2;
      }

      devPaths.push({
        d,
        color,
        bundleKey: conn.bundleKey,
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        labelX,
        labelY,
        count: conn.count,
        throughputTime: conn.throughput_time,
        isBackward,
        endDir,
        connId: { from: conn.from_event_id, to: conn.to_event_id, objectId: conn.object_id },
        key: `dev-conn-${conn.from_event_id}-${conn.to_event_id}-${conn.object_id}-${idx}`,
      });
    });

    return { devEvents, devPaths };
  }, [deviationEvents, deviationConnections, objects, events, layout.laneX, layout.objectColorMap, layout.eventUnifiedY, layout.eventLayouts, layout.eventLevel]);

  const getOpacity = useCallback((itemType: 'event' | 'connection', id: string | { from: string; to: string; objectId: string }) => {
    // Event-card hover does NOT dim other elements — the only hover affordance
    // on a card is its own light-grey background. Connection (pill) hover still
    // fades unrelated paths so the marching-dash effect reads cleanly.
    if (!hoveredConnection) return 1;

    if (hoveredConnection) {
      if (itemType === 'connection') {
        const conn = id as { from: string; to: string; objectId: string };
        if (conn.from === hoveredConnection.from && 
            conn.to === hoveredConnection.to && 
            conn.objectId === hoveredConnection.objectId) return 1;
        return 0.2;
      } else {
        if (id === hoveredConnection.from || id === hoveredConnection.to) return 1;
        return 0.2;
      }
    }

    return 1;
  }, [hoveredEvent, hoveredConnection, connections]);

  const isEventSelected = useCallback((eventId: string) => {
    if (!selectedEvents) return true;
    return selectedEvents.includes(eventId);
  }, [selectedEvents]);

  const isConnectionSelected = useCallback((from: string, to: string, objectId: string) => {
    if (!selectedConnections) return true;
    return selectedConnections.some(c => c.from === from && c.to === to && c.objectId === objectId);
  }, [selectedConnections]);

  // G6 — arrowhead de-duplication. A target dot entered by both a happy-path
  // edge and a deviation edge (or two same-direction edges) must show exactly
  // ONE arrowhead per (target event, object, approach direction). Happy-path
  // arrows win; deviation arrows yield (resolved in the dev render). Only
  // SELECTED edges claim a key, so a hidden edge never suppresses a visible one.
  const arrowKey = (eventId: string, objectId: string, dir: "down" | "up") =>
    `${eventId}|${objectId}|${dir}`;
  const mainArrowKeys = useMemo(() => {
    const s = new Set<string>();
    for (const seg of layout.pathSegments) {
      if (!isConnectionSelected(seg.fromEventId, seg.toEventId, seg.objectId)) continue;
      // Main arrows always enter the target dot from above (apex down).
      s.add(arrowKey(seg.toEventId, seg.objectId, "down"));
    }
    return s;
  }, [layout.pathSegments, isConnectionSelected]);

  // ---------- Deviation-pill collision resolver (G4c) ----------
  // Happy-path pills are deconflicted in `layout`, but deviation-edge pills were
  // placed raw — clustered dev pills (esp. backward rework labels stacked in the
  // left gutter) overlap. Nudge each dev pill along the axis that keeps it ON
  // its path: forward pills (horizontal mid-segment) along X; backward pills
  // (vertical detour/spine) along Y. Avoid other dev pills + the visible happy-
  // path pills. Best-effort, bounded. Returns key → adjusted {labelX,labelY}.
  const devPillLayout = useMemo(() => {
    const adjusted = new Map<string, { labelX: number; labelY: number }>();
    if (deviationLayout.devPaths.length === 0) return adjusted;
    const PILL_HEIGHT = 22;
    const X_BUFFER = 6;
    const Y_BUFFER = 4;
    const STEP = PILL_HEIGHT + Y_BUFFER;
    const MAX_ATTEMPTS = 10;
    const timeKpi = isTimeKpi(kpiType);
    const devPillWidth = (p: { count?: string; throughputTime?: string }) => {
      const v = timeKpi ? (p.throughputTime ?? "—") : (p.count ?? "—");
      return v.length * 6.5 + 30;
    };
    const mainPillWidth = (s: { count: string; throughputTime?: string }) => {
      const v = getKpiValue({ fromEventId: "", toEventId: "", count: s.count, throughputTime: s.throughputTime });
      return v.length * 6.5 + 30;
    };
    const mainRects = layout.pathSegments
      .filter((s) => isConnectionSelected(s.fromEventId, s.toEventId, s.objectId))
      .map((s) => {
        const w = mainPillWidth(s);
        return { left: s.labelX - w / 2, right: s.labelX + w / 2, top: s.labelY - PILL_HEIGHT / 2, bottom: s.labelY + PILL_HEIGHT / 2 };
      });
    // Also avoid CARDS (a pill must never sit on a card): main event cards +
    // deviation cards. cardHeight = 52 (±26 from the card's Y center).
    for (const el of layout.eventLayouts.values()) {
      const rightmostDotX = Math.max(...el.dots.map((dt) => dt.x));
      const w = computeCardWidth(el.event.label, el.event.count, el.event.eventCount ?? el.event.count);
      const left = rightmostDotX + CARD_OFFSET;
      mainRects.push({ left, right: left + w, top: el.y - 26, bottom: el.y + 26 });
    }
    for (const de of deviationLayout.devEvents) {
      mainRects.push({ left: de.cardX, right: de.cardX + de.cardWidth, top: de.y - 26, bottom: de.y + 26 });
    }
    const work = deviationLayout.devPaths.map((p) => {
      const w = devPillWidth(p);
      const yLo = Math.min(p.from.y, p.to.y) + NODE_RADIUS + PILL_HEIGHT / 2 + 4;
      const yHi = Math.max(p.from.y, p.to.y) - NODE_RADIUS - PILL_HEIGHT / 2 - 4;
      const xLo = Math.min(p.from.x, p.to.x) + NODE_RADIUS + w / 2 + 4;
      const xHi = Math.max(p.from.x, p.to.x) - NODE_RADIUS - w / 2 - 4;
      return { p, w, labelX: p.labelX, labelY: p.labelY, yLo, yHi, xLo, xHi };
    });
    const overlaps = (ax: number, ay: number, aw: number, b: { left: number; right: number; top: number; bottom: number }) =>
      ax - aw / 2 < b.right + X_BUFFER && ax + aw / 2 > b.left - X_BUFFER &&
      ay - PILL_HEIGHT / 2 < b.bottom + Y_BUFFER && ay + PILL_HEIGHT / 2 > b.top - Y_BUFFER;
    const rectOf = (wi: { labelX: number; labelY: number; w: number }) => ({
      left: wi.labelX - wi.w / 2, right: wi.labelX + wi.w / 2, top: wi.labelY - PILL_HEIGHT / 2, bottom: wi.labelY + PILL_HEIGHT / 2,
    });
    for (let i = 0; i < work.length; i++) {
      const wi = work[i];
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const obstacles = mainRects.concat(work.slice(0, i).map(rectOf));
        let collided = false;
        for (const ob of obstacles) {
          if (overlaps(wi.labelX, wi.labelY, wi.w, ob)) { collided = true; break; }
        }
        if (!collided) break;
        const dir = attempt % 2 === 0 ? 1 : -1;
        const mag = STEP * Math.ceil((attempt + 1) / 2);
        if (wi.p.isBackward) {
          const cand = wi.labelY + dir * mag;
          if (cand >= wi.yLo && cand <= wi.yHi) wi.labelY = cand;
          else { const other = wi.labelY - dir * mag; if (other >= wi.yLo && other <= wi.yHi) wi.labelY = other; }
        } else {
          const cand = wi.labelX + dir * mag;
          if (cand >= wi.xLo && cand <= wi.xHi) wi.labelX = cand;
          else { const other = wi.labelX - dir * mag; if (other >= wi.xLo && other <= wi.xHi) wi.labelX = other; }
        }
      }
      adjusted.set(wi.p.key, { labelX: wi.labelX, labelY: wi.labelY });
    }
    return adjusted;
  }, [deviationLayout.devPaths, deviationLayout.devEvents, layout.pathSegments, layout.eventLayouts, kpiType, isConnectionSelected, getKpiValue]);

  // Main happy-path pills can't see DEVIATION cards (those are computed in the
  // separate deviationLayout, after the in-layout main-pill resolver). Nudge a
  // main pill UP off any dev card it lands on — e.g. a loop-back dev card
  // overlapping a main edge's count pill. Bounded best-effort. Returns
  // pathSegments-index → adjusted labelY.
  const mainPillLayout = useMemo(() => {
    const adj = new Map<number, number>();
    if (deviationLayout.devEvents.length === 0) return adj;
    const PILL_HEIGHT = 22, X_BUFFER = 6, Y_BUFFER = 4, STEP = 26, MAX = 4;
    const devCards = deviationLayout.devEvents.map((de) => ({
      left: de.cardX, right: de.cardX + de.cardWidth, top: de.y - 26, bottom: de.y + 26,
    }));
    layout.pathSegments.forEach((s, i) => {
      if (!isConnectionSelected(s.fromEventId, s.toEventId, s.objectId)) return;
      const v = getKpiValue({ fromEventId: s.fromEventId, toEventId: s.toEventId, count: s.count, throughputTime: s.throughputTime });
      const w = v.length * 6.5 + 30;
      let labelY = s.labelY;
      for (let a = 0; a < MAX; a++) {
        const hit = devCards.find((c) =>
          s.labelX - w / 2 < c.right + X_BUFFER && s.labelX + w / 2 > c.left - X_BUFFER &&
          labelY - PILL_HEIGHT / 2 < c.bottom + Y_BUFFER && labelY + PILL_HEIGHT / 2 > c.top - Y_BUFFER);
        if (!hit) break;
        labelY -= STEP;
      }
      if (labelY !== s.labelY) adj.set(i, labelY);
    });
    return adj;
  }, [layout.pathSegments, deviationLayout.devEvents, isConnectionSelected, getKpiValue]);

  // Canvas extents — expand to include deviation event positions + a small
  // buffer so side-mounted dev cards and left-routed backward edges aren't
  // clipped at zoom 100%.
  const baseMaxX = Math.max(...Array.from(layout.laneX.values()));
  const baseMaxY = Math.max(...Array.from(layout.eventUnifiedY.values()));
  const devMaxX = deviationLayout.devEvents.length > 0
    ? Math.max(...deviationLayout.devEvents.map((d) => d.cardX + d.cardWidth))
    : 0;
  const devMinX = deviationLayout.devEvents.length > 0
    ? Math.min(...deviationLayout.devEvents.map((d) => d.cardX), 0)
    : 0;
  // Backward-edge detours extend further left than dev cards. Pick up the
  // leftmost labelX (which equals detourX for backward paths) so the
  // canvas grows to include them.
  const pathMinX = deviationLayout.devPaths.length > 0
    ? Math.min(...deviationLayout.devPaths.map((p) => p.labelX), 0)
    : 0;
  const maxX = Math.max(baseMaxX + CARD_WIDTH_MAX + 100, devMaxX + 60);
  const maxY = baseMaxY + 150;
  const minX = Math.min(0, devMinX - 60, pathMinX - 60);
  const viewBoxWidth = maxX - minX;
  const baseW = Math.max(viewBoxWidth, 700);
  const baseH = Math.max(maxY, 500);

  // Pan + zoom state. Drag = pan; wheel = zoom (cursor-anchored). The viewBox
  // is the source of truth — width/height of the SVG track the container, so
  // chrome (KPI selector, sliders) stays anchored to the page even as the
  // canvas pans/zooms internally.
  // Initial zoom = 1 in both modes. The SVG's preserveAspectRatio="xMidYMin
  // meet" handles fit-to-container scaling on its own; an extra JS-side zoom
  // multiplier would compound (too small) or fight against it.
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // SVG `preserveAspectRatio="xMidYMin meet"` already fits the viewBox to
  // the container (anchored top, centered horizontally) once the container
  // has a bounded height. No JS-side auto-fit is needed; user pan/zoom
  // takes over from the default zoom=1.
  // When true, the inner <g> uses a CSS transition for smooth interpolation
  // (e.g. auto-pan to a newly revealed deviation). Disabled during direct
  // user input (drag, wheel) so manual pan/zoom feels snappy.
  const [animating, setAnimating] = useState(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tracks which deviation bundles have ever been revealed so the first-time
  // zoom-in only fires once per bundle (not on every slider toggle).
  const everRevealedRef = useRef<Set<string>>(new Set());

  // Non-passive wheel listener — React's synthetic onWheel runs in a passive
  // listener, so calling preventDefault() in a JSX onWheel handler is a no-op
  // and the outer page still scrolls. Attach via addEventListener with
  // { passive: false } so we can stop the page from scrolling under us.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (animating) setAnimating(false);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.max(0.3, Math.min(3, zoom * factor));
      if (newZoom === zoom) return;
      const rect = node.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const wx = (cx - panX) / zoom;
      const wy = (cy - panY) / zoom;
      setPanX(cx - wx * newZoom);
      setPanY(cy - wy * newZoom);
      setZoom(newZoom);
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, [zoom, panX, panY, animating]);

  // Auto-pan (and a small one-time zoom-in) to centre the centroid of
  // newly-revealed deviation items each time `revealTick` increments. The
  // first time a bundle is revealed, also zoom in slightly (capped at 1.3×)
  // so the user's eye lands on what changed. Subsequent reveals of the same
  // bundle just pan, no zoom.
  useEffect(() => {
    if (!revealTick || !lastRevealedKeys || lastRevealedKeys.length === 0) return;
    const targetSet = new Set(lastRevealedKeys);
    const points: Array<{ x: number; y: number }> = [];
    deviationLayout.devEvents.forEach((d) => {
      if (targetSet.has(d.input.bundleKey)) points.push({ x: d.x, y: d.y });
    });
    deviationLayout.devPaths.forEach((p) => {
      if (targetSet.has(p.bundleKey)) points.push({ x: p.labelX, y: p.labelY });
    });
    if (points.length === 0) return;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    // Mark these bundles as ever-revealed regardless of whether we focus —
    // the visual reveal happened (fade-in + halo); only the camera move is
    // conditional on visibility.
    const trulyNew = lastRevealedKeys.filter((k) => !everRevealedRef.current.has(k));
    trulyNew.forEach((k) => everRevealedRef.current.add(k));
    const isFirstTime = trulyNew.length > 0;

    // Skip focus when the centroid is already comfortably visible — defined
    // here as inside the central 50% of the viewBox after the current
    // transform. The user's eye is already on it; an extra pan would feel
    // disorienting. Anything outside that zone (off-screen or near edges)
    // does trigger the smooth focus pan + first-time zoom-in.
    const sx = panX + cx * zoom;
    const sy = panY + cy * zoom;
    const viewCenterX = minX + baseW / 2;
    const viewCenterY = baseH / 2;
    const inComfortZone =
      Math.abs(sx - viewCenterX) < baseW * 0.25 &&
      Math.abs(sy - viewCenterY) < baseH * 0.25;
    if (inComfortZone) return;
    const targetZoom = isFirstTime
      ? Math.min(1.3, Math.max(zoom, zoom * 1.18))
      : zoom;

    const targetPanX = minX + baseW / 2 - cx * targetZoom;
    const targetPanY = baseH / 2 - cy * targetZoom;
    setAnimating(true);
    if (targetZoom !== zoom) setZoom(targetZoom);
    setPanX(targetPanX);
    setPanY(targetPanY);
    const t = setTimeout(() => setAnimating(false), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealTick]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only pan on background drag — let event/connection handlers run first.
    if ((e.target as Element).closest("[data-pe-interactive]")) return;
    if (animating) setAnimating(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPanX(dragRef.current.panX + (e.clientX - dragRef.current.x));
    setPanY(dragRef.current.panY + (e.clientY - dragRef.current.y));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn("relative h-full w-full overflow-hidden bg-white select-none", className)}
      style={{
        cursor: dragRef.current ? "grabbing" : "grab",
        touchAction: "none",
        overscrollBehavior: "contain",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
    <svg
      width="100%"
      height="100%"
      viewBox={`${minX} -90 ${baseW} ${baseH + 90}`}
      preserveAspectRatio="xMidYMin meet"
      style={{ overflow: "hidden", display: "block" }}
    >
      <defs>
        <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
          {/* Subtle box-shadow-xs equivalent — real Celonis cards use a very soft drop. */}
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.06" />
        </filter>

        <style>
          {`
            /* Marching-dash flow animation on hover. Dashes "march" downward
               at a steady pace; densely-packed white blocks on the colored
               lane match real Celonis.
               The offset MUST equal one full dash-pattern length (dash+gap =
               8+6 = 14) so the loop wraps seamlessly. Using a non-multiple
               (e.g. -16) causes a visible jitter at each loop boundary. */
            @keyframes flowDash {
              to {
                stroke-dashoffset: -14;
              }
            }
            .animated-path {
              animation: flowDash 0.5s linear infinite;
            }
            /* Deviation reveal — fades new events/paths in quickly when they
               first mount. CSS animations only run once per element instance,
               so existing items stay stable on re-renders. */
            @keyframes peDevFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            .pe-dev-fade-in {
              animation: peDevFadeIn 0.35s ease-out;
            }
            @keyframes peLaneFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            .pe-lane-fade-in {
              animation: peLaneFadeIn 0.35s ease-out;
            }
          `}
        </style>
      </defs>

      <g
        transform={`translate(${panX}, ${panY}) scale(${zoom})`}
        style={{ transition: animating ? "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}
      >

      {/* ---------- Reveal halos (back layer) ----------
       *  Painted FIRST so all main-flow elements (lanes, labels, dots, cards)
       *  AND the colored deviation paths/dots/cards render on top. Mirrors
       *  the original Celonis treatment where the light-blue accent sits
       *  behind every other graph element. Visible for the 10s after a
       *  slider tick reveals a bundle.
       *
       *  Each highlighted deviation event gets TWO independent halos:
       *  one around its dot on the parent lane, and one around its card.
       *  Highlighted deviation paths get a wider light-blue stroke trace.
       */}
      {deviationLayout.devPaths
        .filter((p) => highlightedBundleKeys?.has(p.bundleKey))
        .map((p) => (
          <path
            key={`halo-path-${p.key}`}
            d={p.d}
            stroke="#a8c8f8"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          />
        ))}
      {deviationLayout.devEvents
        .filter((d) => highlightedBundleKeys?.has(d.input.bundleKey))
        .map((d) => {
          const cardHeight = 52;
          const DOT_HALO_R = NODE_RADIUS + 8;
          const CARD_HALO_PAD = 8;
          return (
            <g key={`halo-event-${d.input.id}`} style={{ pointerEvents: "none" }}>
              {/* Halo around the dot — a single light-blue circle. */}
              <circle cx={d.x} cy={d.y} r={DOT_HALO_R} fill="#a8c8f8" />
              {/* Halo around the card — corner radius = card's rx (8) +
               *  padding, so the halo edge stays a constant offset from the
               *  card edge (parallel border). NOT a pill. */}
              <rect
                x={d.cardX - CARD_HALO_PAD}
                y={d.y - cardHeight / 2 - CARD_HALO_PAD}
                width={d.cardWidth + 2 * CARD_HALO_PAD}
                height={cardHeight + 2 * CARD_HALO_PAD}
                rx={8 + CARD_HALO_PAD}
                ry={8 + CARD_HALO_PAD}
                fill="#a8c8f8"
              />
            </g>
          );
        })}

      {/* Lanes end at their last event's port dot — no terminal stub / end-dot
       *  rendered (feedback G1). `objectTerminalPaths` is intentionally empty. */}

      {/* Lane Join Segments - horizontal connectors from lane to shared event dots */}
      {layout.laneJoinSegments.map((seg, idx) => {
        const isEventHovered = hoveredEvent === seg.eventId;
        const opacity = getOpacity('event', seg.eventId);
        const isSelected = isEventSelected(seg.eventId);

        if (!isSelected) return null;

        return (
          <path
            key={`join-${seg.objectId}-${seg.eventId}-${idx}`}
            d={seg.d}
            stroke={seg.color}
            strokeWidth={isEventHovered ? 7 : 6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity,
              transition: 'opacity 0.2s, stroke-width 0.2s',
            }}
          />
        );
      })}

      {/* Object Start Labels with short initial segment.
       *
       * Mirrors real Celonis lane-start: hollow circle, then a DASHED segment
       * down to the first event dot. The hash-icon count badge is lane-colored
       * (icon-colorized).
       */}
      {layout.objectStartLabels.map(({ obj, x, y, startY, stubD }) => (
        <g key={`label-${obj.id}`} className="pe-lane-fade-in">
          {/* Stub path: head → first event dot. Vertical at lane's natural X,
           *  bending horizontally near the bottom for shared first events. */}
          <path
            d={stubD}
            stroke={obj.color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: hoveredConnection ? 0.3 : 1,
              transition: 'opacity 0.2s',
            }}
          />
          <g
            transform={`translate(${x}, ${y})`}
            style={{ opacity: hoveredConnection ? 0.5 : 1 }}
          >
            <circle cx="0" cy="0" r="10" fill="white" stroke={obj.color} strokeWidth="1" />
            <text x="22" y="-4" className="text-[13px] font-semibold" fill="#1a1a2e">
              {obj.label}
            </text>
            <rect x="22" y="4" width="11" height="11" rx="2" fill="none" stroke="#64748b" strokeWidth="1" />
            <text x="27.5" y="12" textAnchor="middle" className="text-[8px] font-bold" fill="#64748b">#</text>
            <text x="38" y="12" className="text-[10px]" fill="#64748b">
              {obj.count}
            </text>
          </g>
        </g>
      ))}

      {/* Connection Paths with Arrows */}
      {layout.pathSegments.map((seg, idx) => {
        const connId = { from: seg.fromEventId, to: seg.toEventId, objectId: seg.objectId };
        const isHovered = hoveredConnection?.from === seg.fromEventId && 
                          hoveredConnection?.to === seg.toEventId &&
                          hoveredConnection?.objectId === seg.objectId;
        const isEventHovered = hoveredEvent === seg.fromEventId || hoveredEvent === seg.toEventId;
        const opacity = getOpacity('connection', connId);
        const isSelected = isConnectionSelected(seg.fromEventId, seg.toEventId, seg.objectId);
        
        if (!isSelected) return null;

        return (
          <g key={`path-${seg.objectId}-${idx}`} className="pe-lane-fade-in">
            {/* Main path */}
            {(() => {
              const baseWidth = strokeWidthForCount(seg.count, countRange);
              const renderedWidth = isHovered ? baseWidth + 1 : baseWidth;
              return (
                <path
                  d={seg.d}
                  stroke={seg.color}
                  strokeWidth={renderedWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    opacity,
                    transition: 'opacity 0.2s, stroke-width 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredConnection(connId)}
                  onMouseLeave={() => setHoveredConnection(null)}
                />
              );
            })()}

            {/* Animated marching-dash overlay on hover — matches the lane's
             *  hover-bumped stroke width exactly so no colored border peeks
             *  out laterally. The lane's colored stroke only shows through
             *  the dash *gaps*. */}
            {(isHovered || isEventHovered) && (() => {
              const laneWidth = strokeWidthForCount(seg.count, countRange);
              return (
                <path
                  d={seg.d}
                  stroke="white"
                  strokeWidth={laneWidth + 1}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeDasharray="8 6"
                  className="animated-path"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}

            {/* Arrow pointing into the target activity. Rendered AFTER the
             *  marching-dash overlay so the arrow tip stays a solid filled
             *  triangle on hover instead of getting visually broken up by
             *  the white dashes.
             */}
            {(() => {
              const arrowHalfBase = 7;
              const arrowHeight = 10;
              return (
                <polygon
                  points={`${seg.arrowX},${seg.arrowY + arrowHeight - 2} ${seg.arrowX - arrowHalfBase},${seg.arrowY - 4} ${seg.arrowX + arrowHalfBase},${seg.arrowY - 4}`}
                  fill={seg.color}
                  style={{ opacity, transition: 'opacity 0.2s', pointerEvents: 'none' }}
                />
              );
            })()}

            {/* Edge KPI label is rendered in a SEPARATE pass at the end of
             *  the SVG (see the "Edge labels — top layer" block below) so
             *  it always paints above ALL lanes, including deviation paths
             *  that may cross over a main lane label. */}
          </g>
        );
      })}

      {/* Event Nodes and Cards */}
      {Array.from(layout.eventLayouts.values()).map(({ event, y, dots }) => {
        const isHovered = hoveredEvent === event.id;
        const opacity = getOpacity('event', event.id);
        const isSelected = isEventSelected(event.id);
        
        if (!isSelected) return null;

        const isShared = dots.length > 1;
        // Single, consistent height — real Celonis cards always show one
        // event title + one subtitle count, regardless of how many object
        // lanes touch the event.
        const cardHeight = 52;
        // Per-card adaptive width — sized for the longer of the two possible
        // subtitles so toggling KPI modes doesn't reflow the canvas.
        const cardWidth = computeCardWidth(
          event.label,
          event.count,
          event.eventCount ?? event.count,
        );
        
        // Card positioned to the right of the rightmost dot
        const rightmostDotX = Math.max(...dots.map(d => d.x));

        return (
          <g
            key={`event-${event.id}`}
            className="pe-lane-fade-in"
            style={{
              opacity,
              transition: 'opacity 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredEvent(event.id)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            {/* Event dots — each is a .mope-graph-node__port on its object's lane.
             *  Two concentric circles per the port's --port-outer-color +
             *  --port-inner-color variables: 20px outer (white fill, 1px lane
             *  border) plus a filled inner dot in the lane color. The thin
             *  white ring between them is the visible signature of the port.
             */}
            {/* Dots — wrapped in per-object transform groups so X/Y shifts
             *  (lane reflow on toggle, cluster anchor changes) animate
             *  smoothly via CSS transition on transform. Each dot is keyed
             *  by objectId so React reuses the same DOM node when only the
             *  position changes. */}
            {dots.map((dot) => (
              <g
                key={`dot-${event.id}-${dot.objectId}`}
                transform={`translate(${dot.x}, ${y})`}
                style={{ transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                {/* Outer ring (port surface) */}
                <circle cx={0} cy={0} r={NODE_RADIUS} fill="white" stroke={dot.color} strokeWidth="1" />
                {/* Inner dot (port inner) */}
                <circle cx={0} cy={0} r={6} fill={dot.color} />
              </g>
            ))}

            {/* Connector line from rightmost dot to card — solid 1px. Snap-
             *  positioned (no transition); a 1px line of 16px length isn't
             *  visually noticeable when its endpoints jump on reflow. */}
            <line
              x1={rightmostDotX + NODE_RADIUS + 2}
              y1={y}
              x2={rightmostDotX + CARD_OFFSET - 2}
              y2={y}
              stroke="#d3d3dd"
              strokeWidth="1"
            />

            {/* Card group — transform-based positioning with CSS transition
             *  so lane-toggle reflows smoothly slide the card to its new
             *  spot instead of snapping. */}
            <g
              transform={`translate(${rightmostDotX + CARD_OFFSET}, ${y - cardHeight / 2})`}
              style={{ transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              {/* Card background — border stays subdued #d3d3dd at all times.
               *  Hover affordance is the fill switching to neutral-50 (#f1f0f5),
               *  not a border color or width change. */}
              <rect
                x="0"
                y="0"
                width={cardWidth}
                height={cardHeight}
                rx="8"
                fill={isHovered ? "#f1f0f5" : "white"}
                stroke="#d3d3dd"
                strokeWidth="1"
                filter="url(#cardShadow)"
                style={{ transition: 'fill 0.2s' }}
              />

              {/* Event title — 13px regular, dark. Line-height 1.2 puts the baseline at ~22px from the top. Font-family inherited from global svg text rule. */}
              <text x="12" y="22" className="text-[13px]" fill="#1a1a2e">
                {event.label.length > 26 ? event.label.slice(0, 26) + '…' : event.label}
              </text>

              {/* Subtitle — 11px medium, subdued. Switches by KPI mode:
               *   object-count  → event.count       (e.g. "32K objects")
               *   event-count   → event.eventCount  (e.g. "41K times")
               *   throughput-time → event.eventCount (cards show occurrence;
               *                     time only renders on the lane pills)
               *  Falls back to event.count if eventCount is absent.
               */}
              <text x="12" y="40" className="text-[11px] font-medium" fill="#64748b">
                {kpiType === "object-count"
                  ? event.count
                  : (event.eventCount ?? event.count)}
              </text>

              {/* Hover-only clock affordance to the right of the card. */}
              {isHovered && (
                <g transform={`translate(${cardWidth + 8}, ${cardHeight / 2 - 14})`}>
                  <rect
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                    rx="6"
                    fill="#ffffff"
                    stroke="#d3d3dd"
                    strokeWidth="1"
                  />
                  <circle cx="14" cy="14" r="7" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <line x1="14" y1="14" x2="14" y2="9" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="14" y1="14" x2="18" y2="15" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              )}
            </g>
          </g>
        );
      })}

      {/* ---------- Deviation paths ---------- */}
      {(() => {
        // G6: dev-vs-dev arrowhead claims within this render pass (the dev-vs-
        // main decision uses mainArrowKeys). First selected dev to reach a dot
        // from a given direction owns the arrowhead.
        const claimedDevArrows = new Set<string>();
        return deviationLayout.devPaths.map((p) => {
        // Reconstruct the same connection key shape used by main paths so
        // hover state and getOpacity work identically across deviations and
        // happy-path edges.
        const connId = p.connId;
        const isHovered =
          hoveredConnection?.from === connId.from &&
          hoveredConnection?.to === connId.to &&
          hoveredConnection?.objectId === connId.objectId;
        const isEventHovered =
          hoveredEvent === connId.from || hoveredEvent === connId.to;
        const opacity = getOpacity("connection", connId);
        const baseStroke = 3;
        const renderedWidth = isHovered ? baseStroke + 1 : baseStroke;
        // G6: does this deviation own its arrowhead? Happy-path wins; first
        // selected dev wins over later dev; hidden edges never claim/draw.
        const devSelected = isConnectionSelected(connId.from, connId.to, connId.objectId);
        const aKey = arrowKey(connId.to, connId.objectId, p.endDir);
        const drawArrow = devSelected && !mainArrowKeys.has(aKey) && !claimedDevArrows.has(aKey);
        if (drawArrow) claimedDevArrows.add(aKey);
        return (
          <g key={p.key} className="pe-dev-fade-in">
            <path
              d={p.d}
              stroke={p.color}
              strokeWidth={renderedWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity,
                transition: "opacity 0.2s, stroke-width 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredConnection(connId)}
              onMouseLeave={() => setHoveredConnection(null)}
            />
            {/* Marching-dash overlay on hover — matches the path's hover-bumped
             *  stroke width so no colored edge peeks out laterally. */}
            {(isHovered || isEventHovered) && (
              <path
                d={p.d}
                stroke="white"
                strokeWidth={renderedWidth + 1}
                fill="none"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeDasharray="8 6"
                className="animated-path"
                style={{ pointerEvents: "none" }}
              />
            )}
            {/* Arrow head pointing into the target dot. Rendered AFTER the
             *  marching-dash overlay so the arrow tip stays a solid filled
             *  triangle on hover. */}
            {drawArrow && (() => {
              const arrowHalfBase = 6;
              const arrowHeight = 9;
              if (p.endDir === "up") {
                // Approached from below (loop-back spine through a dev node):
                // arrow sits at the BOTTOM edge of the target dot, apex up.
                const tipY = p.to.y + NODE_RADIUS + 2;
                return (
                  <polygon
                    points={`${p.to.x},${tipY - arrowHeight + 2} ${p.to.x - arrowHalfBase},${tipY + 4} ${p.to.x + arrowHalfBase},${tipY + 4}`}
                    fill={p.color}
                    style={{ opacity, transition: "opacity 0.2s", pointerEvents: "none" }}
                  />
                );
              }
              // Default: approached from above, arrow at the TOP edge, apex down.
              const tipY = p.to.y - NODE_RADIUS - 2;
              return (
                <polygon
                  points={`${p.to.x},${tipY + arrowHeight - 2} ${p.to.x - arrowHalfBase},${tipY - 4} ${p.to.x + arrowHalfBase},${tipY - 4}`}
                  fill={p.color}
                  style={{ opacity, transition: "opacity 0.2s", pointerEvents: "none" }}
                />
              );
            })()}
            {/* Deviation KPI pill is rendered in the unified "Edge labels —
             *  top layer" pass at the end of the SVG so it sits above every
             *  lane (including other deviation paths that may overlap). */}
          </g>
        );
        });
      })()}

      {/* ---------- Deviation event nodes (dot + card) ---------- */}
      {deviationLayout.devEvents.map((d) => {
        const cardHeight = 52;
        const isHovered = hoveredEvent === d.input.id;
        return (
          <g
            key={`dev-event-${d.input.id}`}
            className="pe-dev-fade-in"
            onMouseEnter={() => setHoveredEvent(d.input.id)}
            onMouseLeave={() => setHoveredEvent(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Dot — wrapped in transform group so X/Y shifts on lane
             *  reflow animate smoothly (same as main events). */}
            <g
              transform={`translate(${d.x}, ${d.y})`}
              style={{ transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <circle cx={0} cy={0} r={NODE_RADIUS} fill="white" stroke={d.color} strokeWidth="1" />
              <circle cx={0} cy={0} r={6} fill={d.color} />
            </g>

            {/* Connector line from dot to card */}
            <line
              x1={d.cardSide === "right" ? d.x + NODE_RADIUS + 2 : d.x - NODE_RADIUS - 2}
              y1={d.y}
              x2={d.cardSide === "right" ? d.cardX - 2 : d.cardX + d.cardWidth + 2}
              y2={d.y}
              stroke="#d3d3dd"
              strokeWidth="1"
            />

            {/* Card — same hover affordance as main events: fill switches to
             *  #f1f0f5; border stays unchanged. Card group transitions
             *  transform so reflows smoothly slide the card. */}
            <g
              transform={`translate(${d.cardX}, ${d.y - cardHeight / 2})`}
              style={{ transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <rect
                x="0"
                y="0"
                width={d.cardWidth}
                height={cardHeight}
                rx="8"
                fill={isHovered ? "#f1f0f5" : "white"}
                stroke="#d3d3dd"
                strokeWidth="1"
                filter="url(#cardShadow)"
                style={{ transition: "fill 0.2s" }}
              />
              <text x="12" y="22" className="text-[13px]" fill="#1a1a2e">
                {d.input.label.length > 26 ? d.input.label.slice(0, 26) + "…" : d.input.label}
              </text>
              <text x="12" y="40" className="text-[11px] font-medium" fill="#64748b">
                {d.input.event_count}
              </text>

              {/* Hover-only clock affordance to the right of the card. */}
              {isHovered && (
                <g transform={`translate(${d.cardWidth + 8}, ${cardHeight / 2 - 14})`}>
                  <rect x="0" y="0" width="28" height="28" rx="6" fill="#ffffff" stroke="#d3d3dd" strokeWidth="1" />
                  <circle cx="14" cy="14" r="7" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <line x1="14" y1="14" x2="14" y2="9" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="14" y1="14" x2="18" y2="15" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              )}
            </g>
          </g>
        );
      })}

      {/* ---------- Edge labels — top layer ----------
       *  Rendered AFTER all main + deviation paths and event nodes so the
       *  edge KPI pills always paint on top of any lane. Without this,
       *  deviation paths that cross over a main lane segment would cover
       *  the main edge label, and vice versa. Mirrors how real Celonis
       *  layers labels above the graph backdrop. */}
      {layout.pathSegments.map((seg, idx) => {
        const connId = { from: seg.fromEventId, to: seg.toEventId, objectId: seg.objectId };
        const isHovered = hoveredConnection?.from === seg.fromEventId &&
                          hoveredConnection?.to === seg.toEventId &&
                          hoveredConnection?.objectId === seg.objectId;
        const opacity = getOpacity('connection', connId);
        const isSelected = isConnectionSelected(seg.fromEventId, seg.toEventId, seg.objectId);
        if (!isSelected) return null;
        const kpiValue = getKpiValue({
          fromEventId: seg.fromEventId,
          toEventId: seg.toEventId,
          count: seg.count,
          throughputTime: seg.throughputTime,
        });
        const showTimerIcon = isTimeKpi(kpiType);
        const textWidth = kpiValue.length * 6.5;
        const pillWidth = textWidth + 30;
        const pillHeight = 22;
        // Nudged up off any deviation card it would overlap (see mainPillLayout).
        const labelY = mainPillLayout.get(idx) ?? seg.labelY;
        return (
          <g
            key={`label-${seg.objectId}-${idx}`}
            transform={`translate(${seg.labelX}, ${labelY})`}
            style={{ opacity, transition: 'opacity 0.2s', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredConnection(connId)}
            onMouseLeave={() => setHoveredConnection(null)}
          >
            <rect
              x={-pillWidth / 2}
              y={-pillHeight / 2}
              width={pillWidth}
              height={pillHeight}
              rx={pillHeight / 2}
              ry={pillHeight / 2}
              fill="white"
              stroke={isHovered ? "#d3d3dd" : "none"}
              strokeWidth="1"
            />
            {showTimerIcon ? (
              <g transform={`translate(${-pillWidth / 2 + 10}, 0)`}>
                <circle cx="0" cy="1" r="5.5" fill="none" stroke={seg.color} strokeWidth="1.5" />
                <line x1="0" y1="1" x2="0" y2="-2" stroke={seg.color} strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="1" x2="2.5" y2="2.5" stroke={seg.color} strokeWidth="1.5" strokeLinecap="round" />
                <rect x="-1.25" y="-7" width="2.5" height="2" rx="0.5" fill={seg.color} />
              </g>
            ) : (
              <g transform={`translate(${-pillWidth / 2 + 6}, 0)`}>
                <rect x="0" y="-5.5" width="11" height="11" rx="2" fill="none" stroke={seg.color} strokeWidth="1" />
                <text x="5.5" y="3" textAnchor="middle" className="text-[8px] font-bold" fill={seg.color}>#</text>
              </g>
            )}
            <text x={-pillWidth / 2 + 22} y="3.5" className="text-[11px] font-medium" fill="#64748b">
              {kpiValue}
            </text>
          </g>
        );
      })}
      {deviationLayout.devPaths.map((p) => {
        const showTimerIcon = isTimeKpi(kpiType);
        const kpiValue = showTimerIcon
          ? (p.throughputTime ?? "—")
          : (p.count ?? "—");
        const textWidth = kpiValue.length * 6.5;
        const pillWidth = textWidth + 30;
        const pillHeight = 22;
        // Deviation pills are interactive just like happy-path pills (feedback
        // G2): hovering highlights the edge + fades unrelated paths.
        const connId = p.connId;
        const isHovered =
          hoveredConnection?.from === connId.from &&
          hoveredConnection?.to === connId.to &&
          hoveredConnection?.objectId === connId.objectId;
        const opacity = getOpacity("connection", connId);
        // G4c: use the collision-resolved pill position.
        const pos = devPillLayout.get(p.key) ?? { labelX: p.labelX, labelY: p.labelY };
        return (
          <g
            key={`dev-label-${p.key}`}
            transform={`translate(${pos.labelX}, ${pos.labelY})`}
            style={{ opacity, transition: "opacity 0.2s", cursor: "pointer" }}
            onMouseEnter={() => setHoveredConnection(connId)}
            onMouseLeave={() => setHoveredConnection(null)}
          >
            <rect
              x={-pillWidth / 2}
              y={-pillHeight / 2}
              width={pillWidth}
              height={pillHeight}
              rx={pillHeight / 2}
              ry={pillHeight / 2}
              fill="white"
              stroke={isHovered ? "#d3d3dd" : "none"}
              strokeWidth="1"
            />
            {showTimerIcon ? (
              <g transform={`translate(${-pillWidth / 2 + 8}, ${-7})`}>
                <circle cx="7" cy="7" r="6" fill="none" stroke={p.color} strokeWidth="1.3" />
                <line x1="7" y1="7" x2="7" y2="3.5" stroke={p.color} strokeWidth="1.3" strokeLinecap="round" />
                <line x1="7" y1="7" x2="9" y2="8" stroke={p.color} strokeWidth="1.3" strokeLinecap="round" />
              </g>
            ) : (
              <g transform={`translate(${-pillWidth / 2 + 6}, ${-6})`}>
                <rect x="0" y="0" width="12" height="12" rx="2" fill="none" stroke={p.color} strokeWidth="1" />
                <text x="6" y="9" textAnchor="middle" className="text-[8px] font-bold" fill={p.color}>#</text>
              </g>
            )}
            <text x={-pillWidth / 2 + 22} y={4} className="text-[11px] font-medium" fill="#64748b">
              {kpiValue}
            </text>
          </g>
        );
      })}
      </g>
    </svg>
    </div>
  );
}
