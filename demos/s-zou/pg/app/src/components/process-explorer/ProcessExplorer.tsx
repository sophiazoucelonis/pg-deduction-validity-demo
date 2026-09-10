/**
 * ProcessExplorer — Process Explorer screen.
 *
 * Top-level template that consumes a ScreenInstance (process-explorer variant)
 * and renders the subway-map flow visualization. Anchors to a Control Tower
 * KPI gap when `data.kpi_overlay` is present. Deviations (event_deviations /
 * connection_deviations) are revealed via the right-edge sliders on the
 * canvas — there is no separate textual "Surfaced deviations" panel because
 * real Celonis surfaces deviations on the canvas itself.
 *
 * Visual fidelity: see references/process-explorer-fidelity-notes.md for the
 * Lovable-vs-real diff.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ProcessExplorerSpec,
  ProcessObject,
  ProcessEvent as YamlEvent,
  ProcessConnection as YamlConnection,
  EventDeviation,
  ConnectionDeviation,
  DeviationEvent,
  DeviationConnection,
} from "@/types/screen-instance";
import {
  PEMetroFlow,
  PEKpiSelector,
  PEDeviationSlider,
  SpaghettiJumpButton,
  PEEventlogSelector,
  type EventlogOption,
  type ProcessEvent as MetroEvent,
  type ProcessConnection as MetroConnection,
  type KpiType,
} from ".";

/**
 * Computes which lanes are visible at slider click 0 (initial mount),
 * before the user touches the eventlog selector. Extracted as a pure
 * function so the default-visibility contract is unit-testable without
 * rendering the full canvas.
 *
 * Rules (see pe-content-rules.md "AI-agent lane connectivity" +
 * "Slider sequence"):
 *  - `default_all_visible: true` shows every lane immediately — an explicit
 *    opt-out of the progressive-reveal slider sequence, reserved for
 *    screens surveying every connected object at a glance (e.g. Enterprise
 *    AI Control Center's Agent Mining canvas). Takes priority over the
 *    focal/agent rule below.
 *  - Otherwise, the focal lane (`is_focal: true`) is always shown alone by
 *    default.
 *  - The agent lane (`is_agent: true`), if present and distinct from the
 *    focal lane, is shown ALONGSIDE it — the one exception to "upstream
 *    lanes start hidden" — because every Enterprise AI Control Center talk
 *    track narrates the agent as already embedded in the process.
 *  - If no object is flagged `is_focal`, fall back to the legacy behavior
 *    (first two lanes) so demos authored before the flag don't regress.
 */
export function defaultVisibleLaneIds(
  objects: Pick<ProcessObject, "id" | "is_focal" | "is_agent">[] | undefined,
  defaultAllVisible?: boolean,
): Set<string> {
  if (!objects) return new Set();
  if (defaultAllVisible) return new Set(objects.map((o) => o.id));
  const focal = objects.find((o) => o.is_focal);
  const agent = objects.find((o) => o.is_agent);
  if (focal) {
    return new Set([focal.id, ...(agent && agent.id !== focal.id ? [agent.id] : [])]);
  }
  return new Set(objects.slice(0, 2).map((o) => o.id));
}

export interface ProcessExplorerProps {
  data: Omit<ProcessExplorerSpec, "kind">;
  /** Composed (inside a board column) vs full-canvas (own view). When
   *  composed, the canvas height is bounded and PE starts at a smaller
   *  initial zoom so cards/text feel proportional to surrounding page
   *  typography. */
  composed?: boolean;
}

/**
 * Translate the schema's snake_case fields into the camelCase shape PEMetroFlow
 * was built around. Keeps the YAML schema canonical without forcing a rename
 * across the existing component code.
 */
function toMetroEvents(events: YamlEvent[]): MetroEvent[] {
  return events.map((e) => ({
    id: e.id,
    label: e.label,
    count: e.count,
    eventCount: e.event_count,
    objectIds: e.object_ids,
    countsByObject: e.counts_by_object,
    syncLevel: e.sync_level,
  }));
}

function toMetroConnections(connections: YamlConnection[]): MetroConnection[] {
  return connections.map((c) => ({
    fromEventId: c.from_event_id,
    toEventId: c.to_event_id,
    objectId: c.object_id,
    count: c.count,
    throughputTime: c.throughput_time,
  }));
}

/** Each deviation event/connection carries a stable bundle key like
 *  "event:0" or "connection:2" so the highlight halo can be applied to
 *  exactly the items that belong to a just-revealed bundle. */
export interface TaggedDeviationEvent extends DeviationEvent {
  bundleKey: string;
}
export interface TaggedDeviationConnection extends DeviationConnection {
  bundleKey: string;
}

/**
 * Resolve the active slice of a deviation array given the slider value:
 *   value=0 → []          (happy path)
 *   value=1 → [first]
 *   value=N → [first..N-1]
 * If the final entry carries a `spaghetti:` payload, it's flattened into
 * inline events/connections at that step. Each item is tagged with a stable
 * bundleKey for highlight tracking.
 */
function activeEventDeviations(
  arr: EventDeviation[] | undefined,
  level: number,
): { events: TaggedDeviationEvent[]; connections: TaggedDeviationConnection[] } {
  const events: TaggedDeviationEvent[] = [];
  const connections: TaggedDeviationConnection[] = [];
  if (!arr) return { events, connections };
  const slice = arr.slice(0, Math.min(level, arr.length));
  slice.forEach((entry, idx) => {
    const bundleKey = `event:${idx}`;
    const payload = entry.spaghetti ?? entry;
    if (payload.events) events.push(...payload.events.map((e) => ({ ...e, bundleKey })));
    if (payload.connections) connections.push(...payload.connections.map((c) => ({ ...c, bundleKey })));
  });
  return { events, connections };
}

function activeConnectionDeviations(
  arr: ConnectionDeviation[] | undefined,
  level: number,
): { connections: TaggedDeviationConnection[] } {
  const connections: TaggedDeviationConnection[] = [];
  if (!arr) return { connections };
  const slice = arr.slice(0, Math.min(level, arr.length));
  slice.forEach((entry, idx) => {
    const bundleKey = `connection:${idx}`;
    const payload = entry.spaghetti ?? entry;
    if (payload.connections) connections.push(...payload.connections.map((c) => ({ ...c, bundleKey })));
  });
  return { connections };
}

export function ProcessExplorer({ data, composed }: ProcessExplorerProps) {
  // Selected KPI for the edge labels. Toggles between Object count (default)
  // and Throughput Time variants. Always defaults to "object-count" — the
  // edge pills will only switch to throughput labels when connections in the
  // YAML carry a throughput_time field.
  const [kpiType, setKpiType] = useState<KpiType>("object-count");
  // Eventlog visibility state. See `defaultVisibleLaneIds` above for the
  // initial-mount rule (focal lane alone, or focal + agent lane together,
  // or every lane when `default_all_visible` opts out of the slider reveal).
  // Upstream lanes are otherwise revealed later via the eventlog selector.
  const [visibleLaneIds, setVisibleLaneIds] = useState<Set<string>>(() =>
    defaultVisibleLaneIds(data.objects, data.default_all_visible),
  );
  // Deviation slider state. Index 0 = happy path; max = all revealed (incl.
  // spaghetti bundle if present).
  const [eventLevel, setEventLevel] = useState(0);
  const [connectionLevel, setConnectionLevel] = useState(0);
  // Track which deviation bundles have just been revealed so PEMetroFlow can
  // paint a 5s #86b8fe halo around them. Cleared after the highlight expires.
  const [highlightedBundles, setHighlightedBundles] = useState<Set<string>>(new Set());
  // Reveal signal — increments once per slider tick that adds bundles. Lets
  // PEMetroFlow auto-pan to the centroid of the newly-revealed items so the
  // user's eye lands on what changed even when it's off-screen.
  const [revealTick, setRevealTick] = useState(0);
  const [lastRevealedKeys, setLastRevealedKeys] = useState<string[]>([]);
  const prevEventLevel = useRef(0);
  const prevConnectionLevel = useRef(0);

  useEffect(() => {
    const newlyRevealed: string[] = [];
    if (eventLevel > prevEventLevel.current) {
      for (let i = prevEventLevel.current; i < eventLevel; i++) newlyRevealed.push(`event:${i}`);
    }
    if (connectionLevel > prevConnectionLevel.current) {
      for (let i = prevConnectionLevel.current; i < connectionLevel; i++) newlyRevealed.push(`connection:${i}`);
    }
    prevEventLevel.current = eventLevel;
    prevConnectionLevel.current = connectionLevel;
    if (newlyRevealed.length === 0) return;
    // G5: highlight ONLY the most-recently-revealed bundle. Replace the set
    // outright instead of accumulating, so an earlier reveal's halo clears the
    // instant a newer reveal lands.
    const revealedSet = new Set(newlyRevealed);
    setHighlightedBundles(revealedSet);
    setLastRevealedKeys(newlyRevealed);
    setRevealTick((t) => t + 1);
    const t = setTimeout(() => {
      // Only clear if this reveal is still the active one — a newer reveal will
      // have replaced the set with its own keys; this stale timer must not wipe
      // it.
      setHighlightedBundles((prev) => {
        const stillCurrent =
          prev.size === revealedSet.size && newlyRevealed.every((k) => prev.has(k));
        return stillCurrent ? new Set<string>() : prev;
      });
    }, 10000);
    return () => clearTimeout(t);
  }, [eventLevel, connectionLevel]);

  // Refuse-style guards. The component is rendered inside a board view; the
  // board view's parent already passes through whatever the YAML declared, so
  // these checks act as a final wall against malformed component specs.
  if (!data.objects || data.objects.length === 0) {
    return (
      <div className="p-6 text-destructive">
        Process Explorer requires at least one object lane. None provided.
        Add at least one entry to <code>objects[]</code> on the
        <code> process-explorer </code> component.
      </div>
    );
  }
  if (!data.events || data.events.length === 0) {
    return (
      <div className="p-6 text-destructive">
        Process Explorer requires at least one event. None provided.
        Add events to the <code>process-explorer</code> component.
      </div>
    );
  }

  // Every lane must have a unique color (ground rule). Lane color is its
  // visual identity; two lanes sharing a color destroys the subway-map
  // metaphor's legibility.
  const seenColors = new Map<string, string>();
  for (const obj of data.objects) {
    const normalized = obj.color.toLowerCase();
    if (seenColors.has(normalized)) {
      return (
        <div className="p-6 text-destructive">
          Two object lanes share the color <code>{obj.color}</code>:{" "}
          <code>{seenColors.get(normalized)}</code> and <code>{obj.id}</code>.
          Pick a unique color per lane from the process-color palette
          (<code>--process-color-N-10</code> tiers).
        </div>
      );
    }
    seenColors.set(normalized, obj.id);
  }

  // Filter the demo's data based on the eventlog selector's visible lanes.
  //   - objects: keep only currently visible lanes
  //   - events: drop events whose participating lanes are ALL hidden;
  //     for shared events with some visible lanes, keep but with object_ids
  //     filtered to visible lanes only (the renderer treats the event as
  //     solo or shared based on the filtered list)
  //   - connections: drop edges whose lane is hidden
  //   - deviations: drop event-deviations whose object_id is hidden, and
  //     drop deviation connections whose lane is hidden
  const visibleObjects = useMemo(
    () => data.objects.filter((o) => visibleLaneIds.has(o.id)),
    [data.objects, visibleLaneIds],
  );
  const visibleEvents = useMemo(() => {
    return data.events
      .map((e) => ({
        ...e,
        object_ids: e.object_ids.filter((id) => visibleLaneIds.has(id)),
      }))
      .filter((e) => e.object_ids.length > 0);
  }, [data.events, visibleLaneIds]);
  const visibleConnections = useMemo(
    () => data.connections.filter((c) => visibleLaneIds.has(c.object_id)),
    [data.connections, visibleLaneIds],
  );
  // Filter deviation bundles to visible lanes AND drop bundles that end up
  // empty (every event/connection in the bundle belonged to a hidden lane).
  // Without this drop, the slider ticks past empty bundles silently — a "+"
  // click advances the level but nothing visible changes on the canvas.
  const visibleEventDeviations = useMemo(
    () =>
      (data.event_deviations ?? [])
        .map((bundle): EventDeviation => {
          const filterEvents = (evs?: DeviationEvent[]) =>
            (evs ?? []).filter((e) => visibleLaneIds.has(e.object_id));
          const filterConns = (cs?: DeviationConnection[]) =>
            (cs ?? []).filter((c) => visibleLaneIds.has(c.object_id));
          if (bundle.spaghetti) {
            return {
              spaghetti: {
                events: filterEvents(bundle.spaghetti.events),
                connections: filterConns(bundle.spaghetti.connections),
              },
            };
          }
          return {
            events: filterEvents(bundle.events),
            connections: filterConns(bundle.connections),
          };
        })
        .filter((bundle) => {
          const payload = bundle.spaghetti ?? bundle;
          return (
            (payload.events?.length ?? 0) > 0 ||
            (payload.connections?.length ?? 0) > 0
          );
        }),
    [data.event_deviations, visibleLaneIds],
  );
  const visibleConnectionDeviations = useMemo(
    () =>
      (data.connection_deviations ?? [])
        .map((bundle): ConnectionDeviation => {
          const filterConns = (cs?: DeviationConnection[]) =>
            (cs ?? []).filter((c) => visibleLaneIds.has(c.object_id));
          if (bundle.spaghetti) {
            return { spaghetti: { connections: filterConns(bundle.spaghetti.connections) } };
          }
          return { connections: filterConns(bundle.connections) };
        })
        .filter((bundle) => {
          const payload = bundle.spaghetti ?? bundle;
          return (payload.connections?.length ?? 0) > 0;
        }),
    [data.connection_deviations, visibleLaneIds],
  );

  const baseEvents = toMetroEvents(visibleEvents);
  const baseConnections = toMetroConnections(visibleConnections);

  const eventDeviationSlice = useMemo(
    () => activeEventDeviations(visibleEventDeviations, eventLevel),
    [visibleEventDeviations, eventLevel],
  );
  const connectionDeviationSlice = useMemo(
    () => activeConnectionDeviations(visibleConnectionDeviations, connectionLevel),
    [visibleConnectionDeviations, connectionLevel],
  );

  // FULL (un-sliced) deviation set for the visible lanes — passed to PEMetroFlow
  // purely to RESERVE horizontal lane room (G4b/G7), so lane X positions stay
  // stable as the slider reveals deviations one at a time (it only reflows on a
  // lane toggle, which already reflows). NOT rendered.
  const reserveEventDeviationSlice = useMemo(
    () => activeEventDeviations(visibleEventDeviations, visibleEventDeviations.length),
    [visibleEventDeviations],
  );
  const reserveConnectionDeviationSlice = useMemo(
    () => activeConnectionDeviations(visibleConnectionDeviations, visibleConnectionDeviations.length),
    [visibleConnectionDeviations],
  );

  // Slider max tracks the VISIBLE (post-filter) bundle count so each "+" tick
  // reveals exactly one visible bundle.
  const eventMax = visibleEventDeviations.length;
  const connectionMax = visibleConnectionDeviations.length;

  // Clamp slider levels when a lane toggle shrinks the visible bundle count.
  // Without this, the slider can sit "past" the new max and the canvas shows
  // a stale reveal until the user manually drags back.
  useEffect(() => {
    if (eventLevel > eventMax) setEventLevel(eventMax);
  }, [eventMax, eventLevel]);
  useEffect(() => {
    if (connectionLevel > connectionMax) setConnectionLevel(connectionMax);
  }, [connectionMax, connectionLevel]);
  // Scope label for the slider counter pill — first object's label gives a
  // sensible "process activity" label when there's only one lane; falls back
  // to the demo's domain name otherwise.
  const scopeLabel = data.objects[0]?.label ?? "Process";

  const jumpToSpaghetti = () => {
    if (eventMax > 0) setEventLevel(eventMax);
    if (connectionMax > 0) setConnectionLevel(connectionMax);
  };

  // Build the eventlog selector menu options: only the demo's actual lanes.
  // Real Celonis would list every eventlog the customer has connected to
  // their process; for our prototype, only the lanes the demo author
  // included exist as data.
  const eventlogOptions: EventlogOption[] = useMemo(
    () =>
      data.objects.map((o) => ({
        id: o.id,
        label: o.label,
        color: o.color,
        interactive: true,
      })),
    [data.objects],
  );

  // Inherit the column's stretched height from BoardView's h-full chain.
  // No min-h floor — that would push the column past the viewport on short
  // screens. SVG preserveAspectRatio handles fit at whatever height it gets.
  return (
    <div className="font-sans h-full min-h-0">
    <div className="relative h-full overflow-hidden rounded-xl border border-[#d3d3dd] bg-white">
      {/* Pan-and-zoom canvas. Fills the view; drag = pan, wheel = zoom.
       *  Chrome (KPI selector top-left, deviation sliders right) is absolutely
       *  positioned so it stays anchored regardless of canvas pan/zoom. */}
      <PEMetroFlow
        objects={visibleObjects}
        events={baseEvents}
        connections={baseConnections}
        kpiType={kpiType}
        deviationEvents={eventDeviationSlice.events}
        deviationConnections={[
          ...eventDeviationSlice.connections,
          ...connectionDeviationSlice.connections,
        ]}
        reserveDeviationEvents={reserveEventDeviationSlice.events}
        reserveDeviationConnections={[
          ...reserveEventDeviationSlice.connections,
          ...reserveConnectionDeviationSlice.connections,
        ]}
        highlightedBundleKeys={highlightedBundles}
        revealTick={revealTick}
        lastRevealedKeys={lastRevealedKeys}
      />

      {/* Top-left chrome: KPI selector + Eventlog visibility selector. Stays
       *  in place during pan/zoom. */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <PEKpiSelector selectedKpi={kpiType} onSelectKpi={setKpiType} />
        <PEEventlogSelector
          options={eventlogOptions}
          visibleLaneIds={visibleLaneIds}
          onToggleLane={(laneId) => {
            setVisibleLaneIds((prev) => {
              const next = new Set(prev);
              if (next.has(laneId)) next.delete(laneId);
              else next.add(laneId);
              return next;
            });
          }}
        />
      </div>

      {/* Right-edge chrome: events slider + jump-to-spaghetti + connections
       *  slider. ALWAYS rendered — even when the demo has no deviations
       *  authored — so the Process Explorer chrome looks complete and
       *  consistent across every demo. When max=0 the slider renders
       *  in a non-interactive state. */}
      <div className="absolute right-3 top-4 z-10 flex flex-col items-center gap-3">
        <PEDeviationSlider
          kind="events"
          scopeLabel={scopeLabel}
          value={eventLevel}
          max={eventMax}
          onChange={setEventLevel}
        />
        <SpaghettiJumpButton onClick={jumpToSpaghetti} />
        <PEDeviationSlider
          kind="connections"
          scopeLabel={scopeLabel}
          value={connectionLevel}
          max={connectionMax}
          onChange={setConnectionLevel}
        />
      </div>
    </div>
    </div>
  );
}
