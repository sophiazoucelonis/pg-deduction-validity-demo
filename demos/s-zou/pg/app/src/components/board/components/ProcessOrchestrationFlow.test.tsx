// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProcessOrchestrationFlow } from "./ProcessOrchestrationFlow";
import type { ProcessOrchestrationFlowSpec } from "@/types/screen-instance";

const branchingSpec: ProcessOrchestrationFlowSpec = {
  kind: "process-orchestration-flow",
  title: "Payment Release Orchestration",
  trigger: {
    case_id: "PAY-1",
    source_screen: "05-operate-app-detail",
    action_label: "Trigger Payment Release",
  },
  steps: [
    { id: "trigger", step_type: "start", label: "Trigger Payment Release", actor: "trigger", status: "complete" },
    { id: "route", step_type: "gateway", subtype: "exclusive", label: "Route by amount", actor: "system", status: "complete" },
    { id: "auto", step_type: "process", label: "Auto-approve", actor: "system", status: "current" },
    { id: "manual", step_type: "process", label: "Request approval", actor: "form", status: "skipped" },
    { id: "merge", step_type: "converge", label: "Rejoin", actor: "system", status: "pending" },
    { id: "agent", step_type: "process", label: "Notify vendor", actor: "agent", status: "pending" },
  ],
  connections: [
    { from: "trigger", to: "route" },
    { from: "route", to: "auto", condition: "Amount ≤ $50k" },
    { from: "route", to: "manual", is_default: true },
    { from: "auto", to: "merge" },
    { from: "manual", to: "merge" },
    { from: "merge", to: "agent" },
  ],
};

function renderFlow(spec: ProcessOrchestrationFlowSpec) {
  return render(
    <MemoryRouter>
      <ProcessOrchestrationFlow spec={spec} />
    </MemoryRouter>,
  );
}

describe("ProcessOrchestrationFlow — branching", () => {
  it("renders the gateway + converge diamond captions", () => {
    renderFlow(branchingSpec);
    expect(screen.getByText("Route by amount")).toBeTruthy();
    expect(screen.getByText("Rejoin")).toBeTruthy();
  });

  it("renders the branch condition chip and the default chip", () => {
    renderFlow(branchingSpec);
    expect(screen.getByText("Amount ≤ $50k")).toBeTruthy();
    expect(screen.getByText("default")).toBeTruthy();
  });

  it("marks the not-taken branch step as skipped", () => {
    const { container } = renderFlow(branchingSpec);
    const skipped = container.querySelector(
      '[data-prep-id="process-orchestration-flow-step-manual"]',
    );
    expect(skipped?.getAttribute("data-status")).toBe("skipped");
    // the skipped branch column is dimmed
    expect(container.querySelector(".opacity-60")).toBeTruthy();
  });

  it("renders a plain linear flow unchanged (no gateway → all cards present)", () => {
    const linear: ProcessOrchestrationFlowSpec = {
      kind: "process-orchestration-flow",
      title: "Linear",
      trigger: { case_id: "X", source_screen: "05-operate-app-detail", action_label: "Go" },
      steps: [
        { id: "s1", step_type: "start", label: "Start", actor: "trigger", status: "complete" },
        { id: "s2", step_type: "process", label: "Form", actor: "form", status: "current" },
        { id: "s3", step_type: "resume", label: "Resume", actor: "human", status: "pending" },
        { id: "s4", step_type: "process", label: "Writeback", actor: "system", status: "pending" },
        { id: "s5", step_type: "process", label: "Agent", actor: "agent", status: "pending" },
      ],
      connections: [
        { from: "s1", to: "s2" },
        { from: "s2", to: "s3" },
        { from: "s3", to: "s4" },
        { from: "s4", to: "s5" },
      ],
    };
    const { container } = renderFlow(linear);
    expect(screen.getByText("Writeback")).toBeTruthy();
    // no gateway diamonds in a linear flow
    expect(
      container.querySelector('[data-step-type="gateway"]'),
    ).toBeNull();
  });
});
