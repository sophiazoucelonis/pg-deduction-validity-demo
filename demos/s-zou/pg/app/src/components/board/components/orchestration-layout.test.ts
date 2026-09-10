import { describe, it, expect } from "vitest";
import {
  buildFlowLayout,
  collectBranchPoints,
  type FlowBlock,
} from "./orchestration-layout";
import type {
  OrchestrationConnection,
  OrchestrationStep,
  OrchestrationStepType,
} from "@/types/screen-instance";

// Compact step factory — only the fields the layout cares about.
function step(
  id: string,
  step_type: OrchestrationStepType = "process",
): OrchestrationStep {
  return { id, step_type, label: id, actor: "system", status: "pending" };
}
function conn(from: string, to: string): OrchestrationConnection {
  return { from, to };
}

// Narrowing helpers for terse assertions.
function isFork(b: FlowBlock): b is Extract<FlowBlock, { kind: "fork" }> {
  return b.kind === "fork";
}
function linearIds(b: FlowBlock): string[] {
  return b.kind === "linear" ? b.steps.map((s) => s.id) : [];
}

describe("collectBranchPoints", () => {
  it("detects a node with >1 outgoing edge", () => {
    const bp = collectBranchPoints([conn("g", "a"), conn("g", "b")]);
    expect(bp.has("g")).toBe(true);
    expect(bp.get("g")?.outgoing.length).toBe(2);
  });

  it("ignores linear chains (every node has ≤1 outgoing)", () => {
    const bp = collectBranchPoints([conn("a", "b"), conn("b", "c")]);
    expect(bp.size).toBe(0);
  });

  it("detects a 3-way branch", () => {
    const bp = collectBranchPoints([
      conn("g", "a"),
      conn("g", "b"),
      conn("g", "c"),
    ]);
    expect(bp.get("g")?.outgoing.length).toBe(3);
  });
});

describe("buildFlowLayout", () => {
  it("collapses a pure-linear flow to a single linear block (canonical fallback)", () => {
    const steps = [
      step("s1", "start"),
      step("s2"),
      step("s3", "resume"),
      step("s4"),
      step("s5"),
    ];
    const connections = [
      conn("s1", "s2"),
      conn("s2", "s3"),
      conn("s3", "s4"),
      conn("s4", "s5"),
    ];
    const blocks = buildFlowLayout(steps, connections);
    expect(blocks).toHaveLength(1);
    expect(linearIds(blocks[0])).toEqual(["s1", "s2", "s3", "s4", "s5"]);
  });

  it("splits an exclusive gateway into a fork and rejoins at the converge", () => {
    const steps = [
      step("start", "start"),
      step("g", "gateway"),
      step("a"),
      step("b"),
      step("merge", "converge"),
      step("end"),
    ];
    const connections = [
      conn("start", "g"),
      conn("g", "a"),
      conn("g", "b"),
      conn("a", "merge"),
      conn("b", "merge"),
      conn("merge", "end"),
    ];
    const blocks = buildFlowLayout(steps, connections);
    // [linear(start), fork, linear(end)]
    expect(blocks.map((b) => b.kind)).toEqual(["linear", "fork", "linear"]);
    expect(linearIds(blocks[0])).toEqual(["start"]);
    expect(linearIds(blocks[2])).toEqual(["end"]);

    const fork = blocks[1];
    expect(isFork(fork)).toBe(true);
    if (!isFork(fork)) return;
    expect(fork.gateway.id).toBe("g");
    expect(fork.converge?.id).toBe("merge");
    // Branch order follows connection order.
    expect(fork.branches.map((br) => br.connection.to)).toEqual(["a", "b"]);
    expect(linearIds(fork.branches[0].blocks[0])).toEqual(["a"]);
    expect(linearIds(fork.branches[1].blocks[0])).toEqual(["b"]);
  });

  it("handles a 3-way parallel gateway", () => {
    const steps = [
      step("g", "gateway"),
      step("a"),
      step("b"),
      step("c"),
      step("m", "converge"),
    ];
    const connections = [
      conn("g", "a"),
      conn("g", "b"),
      conn("g", "c"),
      conn("a", "m"),
      conn("b", "m"),
      conn("c", "m"),
    ];
    const blocks = buildFlowLayout(steps, connections);
    const fork = blocks.find(isFork);
    expect(fork?.branches).toHaveLength(3);
    expect(fork?.converge?.id).toBe("m");
  });

  it("resolves the correct converge for a nested gateway (inner vs outer)", () => {
    // outer gateway G1: branch A contains inner gateway G2 (→ C2), branch B → C1
    const steps = [
      step("g1", "gateway"),
      step("g2", "gateway"),
      step("a1"),
      step("a2"),
      step("c2", "converge"),
      step("b"),
      step("c1", "converge"),
      step("end"),
    ];
    const connections = [
      conn("g1", "g2"),
      conn("g1", "b"),
      conn("g2", "a1"),
      conn("g2", "a2"),
      conn("a1", "c2"),
      conn("a2", "c2"),
      conn("c2", "c1"),
      conn("b", "c1"),
      conn("c1", "end"),
    ];
    const blocks = buildFlowLayout(steps, connections);
    const outer = blocks.find(isFork);
    expect(outer?.gateway.id).toBe("g1");
    expect(outer?.converge?.id).toBe("c1"); // outer join, NOT the inner c2
    // Branch A's first block is the inner fork, whose converge is c2.
    const branchA = outer?.branches[0];
    const innerFork = branchA?.blocks.find(isFork);
    expect(innerFork?.gateway.id).toBe("g2");
    expect(innerFork?.converge?.id).toBe("c2");
  });

  it("does not crash when a gateway never converges (open branches)", () => {
    const steps = [step("g", "gateway"), step("a"), step("b")];
    const connections = [conn("g", "a"), conn("g", "b")];
    const blocks = buildFlowLayout(steps, connections);
    const fork = blocks.find(isFork);
    expect(fork?.converge).toBeNull();
    expect(fork?.branches).toHaveLength(2);
  });

  it("captures unequal-length branches without looping", () => {
    const steps = [
      step("g", "gateway"),
      step("a1"),
      step("a2"),
      step("b1"),
      step("m", "converge"),
    ];
    const connections = [
      conn("g", "a1"),
      conn("a1", "a2"),
      conn("a2", "m"),
      conn("g", "b1"),
      conn("b1", "m"),
    ];
    const fork = buildFlowLayout(steps, connections).find(isFork);
    expect(linearIds(fork!.branches[0].blocks[0])).toEqual(["a1", "a2"]);
    expect(linearIds(fork!.branches[1].blocks[0])).toEqual(["b1"]);
  });

  it("terminates on a cyclic graph (visited guard)", () => {
    const steps = [step("a"), step("b"), step("c")];
    const connections = [conn("a", "b"), conn("b", "c"), conn("c", "a")];
    // Should return without hanging; each node rendered at most once.
    const blocks = buildFlowLayout(steps, connections);
    const ids = blocks.flatMap(linearIds);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("ends a branch gracefully at a dangling edge", () => {
    const steps = [step("g", "gateway"), step("a"), step("m", "converge")];
    // branch "b" points at a non-existent step id
    const connections = [
      conn("g", "a"),
      conn("g", "ghost"),
      conn("a", "m"),
    ];
    const blocks = buildFlowLayout(steps, connections);
    const fork = blocks.find(isFork);
    expect(fork?.branches).toHaveLength(2);
    // the dangling branch has no renderable steps
    expect(fork?.branches[1].blocks.flatMap(linearIds)).toEqual([]);
  });

  it("returns [] for empty input", () => {
    expect(buildFlowLayout([], [])).toEqual([]);
  });
});
