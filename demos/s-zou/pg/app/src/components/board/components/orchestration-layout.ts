/**
 * orchestration-layout — pure graph→layout logic for the OE Beat 5 step
 * graph (`ProcessOrchestrationFlow`). Kept free of React so it can be unit
 * tested directly (see orchestration-layout.test.ts).
 *
 * The layout is a **structured fork/merge block model**, NOT a general
 * auto-layout engine. We walk the connection graph from the entry step and
 * emit a tree of blocks:
 *
 *   - `linear` — a straight run of steps rendered as a vertical column.
 *   - `fork`   — a `gateway` step whose outgoing edges become side-by-side
 *                branch columns (each a recursive block list), rejoining at
 *                a shared `converge` step.
 *
 * A flow with no `gateway` step collapses to a single `linear` block — so the
 * canonical linear orchestration renders exactly as it did before branching
 * existed (zero regression).
 *
 * Mirrors the real Celonis OE Digital-Process model (gateway node + branch
 * edges carrying conditions + a converge/"Merge" node); see
 * demo/assets/orchestration-content-rules.md.
 */

import type {
  OrchestrationConnection,
  OrchestrationStep,
} from "@/types/screen-instance";

// ---------- branch-point primitive ----------

export interface BranchPoint {
  fromId: string;
  outgoing: OrchestrationConnection[];
}

/**
 * Group connections by source and keep only the sources with >1 outgoing
 * edge — i.e. the nodes where the flow branches. Order within each group
 * follows the `connections` array (authoring order), which the fork renderer
 * relies on for deterministic left-to-right branch placement.
 */
export function collectBranchPoints(
  connections: OrchestrationConnection[],
): Map<string, BranchPoint> {
  const map = new Map<string, OrchestrationConnection[]>();
  connections.forEach((c) => {
    const arr = map.get(c.from);
    if (arr) arr.push(c);
    else map.set(c.from, [c]);
  });
  const result = new Map<string, BranchPoint>();
  map.forEach((outgoing, fromId) => {
    if (outgoing.length > 1) result.set(fromId, { fromId, outgoing });
  });
  return result;
}

// ---------- block model ----------

export interface LinearBlock {
  kind: "linear";
  steps: OrchestrationStep[];
}

export interface FlowBranch {
  /** The gateway-out edge that starts this branch — carries `condition` /
   *  `is_default` for the branch chip. */
  connection: OrchestrationConnection;
  /** The branch's own sub-flow (recursive; may itself contain forks). */
  blocks: FlowBlock[];
}

export interface ForkBlock {
  kind: "fork";
  gateway: OrchestrationStep;
  branches: FlowBranch[];
  /** The shared merge step where the branches rejoin, or `null` when the
   *  gateway's branches never converge (open branches — rendered to their
   *  own ends). */
  converge: OrchestrationStep | null;
}

export type FlowBlock = LinearBlock | ForkBlock;

// ---------- layout builder ----------

/**
 * Build the block layout for a step graph. Defensive by design — the
 * prototype has no runtime schema validation, so malformed input (dangling
 * edges, cycles, gateways without a converge, unbalanced branches) must
 * terminate cleanly and never throw.
 */
export function buildFlowLayout(
  steps: OrchestrationStep[],
  connections: OrchestrationConnection[],
): FlowBlock[] {
  const byId = new Map<string, OrchestrationStep>();
  steps.forEach((s) => byId.set(s.id, s));

  const outgoing = new Map<string, OrchestrationConnection[]>();
  const incoming = new Map<string, number>();
  connections.forEach((c) => {
    const arr = outgoing.get(c.from);
    if (arr) arr.push(c);
    else outgoing.set(c.from, [c]);
    incoming.set(c.to, (incoming.get(c.to) ?? 0) + 1);
  });

  const entry = findEntry(steps, incoming);
  if (!entry) return [];

  // A single visited-set shared across the whole walk prevents a node from
  // rendering twice and guards against cycles / diamond re-entry.
  const visited = new Set<string>();

  /** Collect every reachable `converge` step id from a start id (BFS). */
  const reachableConverges = (startId: string): Set<string> => {
    const found = new Set<string>();
    const seen = new Set<string>();
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      const step = byId.get(id);
      if (step?.step_type === "converge") found.add(id);
      (outgoing.get(id) ?? []).forEach((c) => queue.push(c.to));
    }
    return found;
  };

  /** The converge closest (by BFS distance) to a gateway among candidates. */
  const closestConverge = (gatewayId: string, candidates: Set<string>): string | null => {
    if (candidates.size === 0) return null;
    const seen = new Set<string>();
    const queue = [gatewayId];
    while (queue.length) {
      const id = queue.shift() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      if (id !== gatewayId && candidates.has(id)) return id;
      (outgoing.get(id) ?? []).forEach((c) => queue.push(c.to));
    }
    return null;
  };

  /**
   * The gateway's shared converge = a converge reachable from EVERY branch
   * (an inner/nested converge is reachable from only one branch, so it never
   * qualifies as the outer join). Among shared candidates, pick the closest.
   */
  const findConverge = (
    gatewayId: string,
    outs: OrchestrationConnection[],
  ): OrchestrationStep | null => {
    if (outs.length === 0) return null;
    let shared: Set<string> | null = null;
    for (const conn of outs) {
      const reach = reachableConverges(conn.to);
      if (shared === null) shared = reach;
      else shared = new Set([...shared].filter((id) => reach.has(id)));
      if (shared.size === 0) break;
    }
    const id = shared ? closestConverge(gatewayId, shared) : null;
    return id ? byId.get(id) ?? null : null;
  };

  /**
   * Walk forward from `startId`, emitting blocks, stopping BEFORE `stopId`
   * (the enclosing converge) — or when the flow terminates / re-enters a
   * visited node.
   */
  const walkFrom = (startId: string | undefined, stopId: string | null): FlowBlock[] => {
    const blocks: FlowBlock[] = [];
    let linear: OrchestrationStep[] = [];
    const flush = () => {
      if (linear.length) {
        blocks.push({ kind: "linear", steps: linear });
        linear = [];
      }
    };

    let cursor: string | undefined = startId;
    while (cursor && cursor !== stopId && !visited.has(cursor)) {
      const step = byId.get(cursor);
      if (!step) break; // dangling edge → end this run gracefully

      if (step.step_type === "gateway") {
        flush();
        visited.add(cursor);
        const outs = outgoing.get(cursor) ?? [];
        const converge = findConverge(cursor, outs);
        const branches: FlowBranch[] = outs.map((conn) => ({
          connection: conn,
          blocks: walkFrom(conn.to, converge?.id ?? null),
        }));
        // Claim the converge for this fork and resume after it.
        let next: string | undefined;
        if (converge) {
          visited.add(converge.id);
          next = (outgoing.get(converge.id) ?? [])[0]?.to;
        }
        blocks.push({ kind: "fork", gateway: step, branches, converge });
        cursor = next;
        continue;
      }

      // Linear step.
      visited.add(cursor);
      linear.push(step);
      const outs = outgoing.get(cursor) ?? [];
      // Exactly one successor → continue the run. Zero → terminal. More than
      // one on a non-gateway → treat as an implicit branch end (defensive;
      // the authoring model uses explicit gateways).
      cursor = outs.length === 1 ? outs[0].to : undefined;
    }

    flush();
    return blocks;
  };

  return walkFrom(entry.id, null);
}

/**
 * Entry step: the first `start` step, else the first step with no incoming
 * edge, else the first step. Kept lenient so partial/hand-authored graphs
 * still render.
 */
function findEntry(
  steps: OrchestrationStep[],
  incoming: Map<string, number>,
): OrchestrationStep | undefined {
  return (
    steps.find((s) => s.step_type === "start") ??
    steps.find((s) => (incoming.get(s.id) ?? 0) === 0) ??
    steps[0]
  );
}

/** Default gateway subtype when a gateway step omits `subtype`. */
export function gatewaySubtype(step: OrchestrationStep): "exclusive" | "parallel" | "inclusive" {
  return step.subtype ?? "exclusive";
}
