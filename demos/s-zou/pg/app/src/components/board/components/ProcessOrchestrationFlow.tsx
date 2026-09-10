/**
 * ProcessOrchestrationFlow — Beat 5 / 06-orchestration step graph.
 *
 * Visualizes the Celonis Orchestration Engine flow that executes when the
 * V/E clicks the primary CTA on Beat 4 (Operate-App Detail). Mirrors the
 * canonical OE Studio chrome from real product screenshots:
 *
 *   Card (vertical, top-to-bottom DAG):
 *     - Light grey header band:
 *         left  = step-type icon (arrow-into-line for start/resume; AF-
 *                 brackets for process)
 *         center= "Start process" / "Process step" / "Resume process"
 *         right = 3-dot menu (decorative; not interactive in v1)
 *     - White body:
 *         left  = body avatar (radar-pulse for start/resume; AF-connector
 *                 stack of 3 small colored squares + "+ N" for process)
 *         right = step.label + optional system · duration line
 *     - Optional narrative below body
 *
 *   Selection / status:
 *     - status: current   → 2px solid Celonis blue ring (matches OE Studio
 *                           selected-step state)
 *     - status: complete  → green ring + "Done" pill
 *     - status: failed    → red ring + "Failed" pill
 *     - status: skipped   → dashed grey, 60% opacity
 *     - status: pending   → neutral grey ring
 *
 *   Connector between cards:
 *     - thin grey vertical line + small grey "+" affordance (mirrors OE
 *       Studio's add-step button — decorative in our render)
 *
 *   Click affordance:
 *     - actor: agent + step.external_url → opens URL in new tab (the per-
 *                       customer Copilot Studio app)
 *     - all other actors → non-clickable
 *
 *   Note: `actor: form` steps are intentionally NOT clickable in v1. The
 *   webform popup is built (see WebformModal.tsx) but disabled until the
 *   submit-flow narrative is finalized.
 *
 * Layout outside the step graph:
 *   - Trigger band at top (case_id · action_label · triggered_at)
 *   - Step graph in the middle (vertical column, centered)
 *   - Summary footer at the bottom (total · completed · eta · value)
 *
 * Self-wrapping (registered in SELF_WRAPPING_KINDS): the renderer carries
 * its own card chrome.
 *
 * See library/orchestration-content-rules.md for derivation rules.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  OrchestrationActor,
  OrchestrationConnection,
  OrchestrationStatus,
  OrchestrationStep,
  OrchestrationStepType,
  ProcessOrchestrationFlowSpec,
} from "@/types/screen-instance";
import { resolveExternalUrl, useDemoPathParams } from "@/lib/demo-paths";
import {
  buildFlowLayout,
  gatewaySubtype,
  type FlowBlock,
  type FlowBranch,
} from "./orchestration-layout";

// One step card / branch column is a fixed width so the fork splitter + merge
// SVG rails can position branch centers deterministically. 400px matches the
// pre-branching linear layout (max-w-md content width) so existing linear
// demos render unchanged.
const STEP_WIDTH = 400; // px
const BRANCH_GAP = 40; // px — horizontal gap between branch columns
const RAIL_HEIGHT = 30; // px — height of the fork/merge connector SVG

export interface ProcessOrchestrationFlowProps {
  spec: ProcessOrchestrationFlowSpec;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

export function ProcessOrchestrationFlow({ spec }: ProcessOrchestrationFlowProps) {
  // Derive the fork/merge block layout from the step graph. A flow with no
  // `gateway` step collapses to a single linear block → renders exactly as it
  // did before branching existed (zero regression).
  const blocks = buildFlowLayout(spec.steps, spec.connections);

  // Canvas pan/zoom state — mirrors OE Studio's canvas affordance.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const navigate = useNavigate();
  const { owner, customer } = useDemoPathParams();

  const onStepClick = (step: OrchestrationStep) => {
    if (step.actor !== "agent" || !step.external_url) return;
    const resolved = resolveExternalUrl(step.external_url, { owner, customer });
    if (resolved.kind === "in-app") navigate(resolved.path);
    else if (resolved.kind === "external")
      window.open(resolved.url, "_blank", "noopener");
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <CanvasArea pan={pan} setPan={setPan} zoom={zoom}>
        <StepGraph blocks={blocks} onStepClick={onStepClick} />
      </CanvasArea>
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
        onReset={resetView}
      />
    </div>
  );
}

// ---------- Page-header actions (rendered into AppLayout's `actions` slot
// when the screen contains a process-orchestration-flow). Replaces the
// default 0% / bell view-indicators on this screen. All controls are
// decorative — they mirror real OE Studio's chrome but don't drive the
// canvas. The Active toggle keeps local state so the visual flips on click.
// ----------

export function OrchestrationActions() {
  const [active, setActive] = useState(true);
  return (
    <div className="flex flex-row items-center gap-3 flex-shrink-0">
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        aria-pressed={active}
        className="flex flex-row items-center gap-2 select-none"
      >
        <span
          className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
            active ? "bg-[#16204a]" : "bg-[#c8c8d3]"
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 ${
              active ? "left-[18px]" : "left-0.5"
            } w-4 h-4 rounded-full bg-white shadow-sm transition-all`}
          />
        </span>
        <span className="text-[13px] text-foreground">{active ? "Active" : "Inactive"}</span>
      </button>
      <span className="block w-px h-5 bg-[#d3d3dd]" aria-hidden="true" />
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-[#d3d3dd] bg-card px-3 py-1.5 text-[13px] text-foreground hover:bg-[#f8f9fa]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Logs
      </button>
      <button
        type="button"
        aria-label="Edit"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground hover:bg-[#f8f9fa]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zM20.71 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.31 1.31 2.75 2.75 1.31-1.31z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}

// ---------- Pannable canvas ----------

function CanvasArea({
  pan,
  setPan,
  zoom,
  children,
}: {
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const { x, y, px, py } = startRef.current;
      setPan({ x: px + (e.clientX - x), y: py + (e.clientY - y) });
    };
    const onUp = () => {
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, setPan]);

  const onMouseDown = (e: React.MouseEvent) => {
    // Don't start a pan if the user is clicking a card or other interactive
    // element — let the click handler run.
    const target = e.target as HTMLElement;
    if (target.closest('[role="button"], button, a, input, textarea, select')) return;
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setDragging(true);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className={`relative flex-1 min-h-0 overflow-hidden bg-card ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle, #e6e6ec 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        className="absolute inset-0 flex flex-col items-center py-10"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center top",
          transition: dragging ? "none" : "transform 120ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- Zoom controls (bottom-left) ----------

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const pct = `${Math.round(zoom * 100)}%`;
  return (
    <div className="absolute left-4 bottom-4 z-10 flex flex-row items-center rounded-lg border border-[#d3d3dd] bg-card shadow-sm">
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset view"
        className="inline-flex items-center justify-center w-9 h-9 text-foreground hover:bg-[#f8f9fa] rounded-l-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="block w-px h-5 bg-[#d3d3dd]" aria-hidden="true" />
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="inline-flex items-center justify-center w-9 h-9 text-foreground hover:bg-[#f8f9fa]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 16l4 4M8 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 px-2 h-9 text-[13px] font-medium text-foreground hover:bg-[#f8f9fa] min-w-[64px] justify-center"
      >
        {pct}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="inline-flex items-center justify-center w-9 h-9 text-foreground hover:bg-[#f8f9fa] rounded-r-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 16l4 4M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ---------- Step graph (fork/merge block layout) ----------
//
// The graph is rendered from the block tree produced by `buildFlowLayout`.
// A `linear` block is a vertical column of step cards; a `fork` block renders
// a gateway diamond, splits into side-by-side branch columns (each a recursive
// block list with a condition chip on top), and rejoins at a converge diamond.

function StepGraph({
  blocks,
  onStepClick,
}: {
  blocks: FlowBlock[];
  onStepClick: (step: OrchestrationStep) => void;
}) {
  return (
    <div className="flex flex-col items-center px-6">
      <FlowBlocks blocks={blocks} onStepClick={onStepClick} />
    </div>
  );
}

// Renders a vertical stack of blocks, with a connector line between each.
function FlowBlocks({
  blocks,
  onStepClick,
}: {
  blocks: FlowBlock[];
  onStepClick: (step: OrchestrationStep) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      {blocks.map((block, i) => (
        <div key={i} className="flex flex-col items-center">
          {i > 0 && <ConnectorLine />}
          {block.kind === "linear" ? (
            <LinearColumn steps={block.steps} onStepClick={onStepClick} />
          ) : (
            <ForkView block={block} onStepClick={onStepClick} />
          )}
        </div>
      ))}
    </div>
  );
}

// A straight run of step cards (the canonical linear look).
function LinearColumn({
  steps,
  onStepClick,
}: {
  steps: OrchestrationStep[];
  onStepClick: (step: OrchestrationStep) => void;
}) {
  return (
    <div className="flex flex-col items-center" style={{ width: STEP_WIDTH }}>
      {steps.map((step, idx) => (
        <div key={step.id} className="flex flex-col items-center w-full">
          {idx > 0 && <ConnectorLine />}
          <StepCard
            step={step}
            stepTypeLabel={stepTypeLabel(step.step_type)}
            onClick={() => onStepClick(step)}
          />
        </div>
      ))}
    </div>
  );
}

// A gateway → side-by-side branches → converge/merge unit. Branch columns are
// sized to the width of their (possibly nested) content so a nested fork never
// overflows into its sibling; the rail bus + drops use those measured widths.
function ForkView({
  block,
  onStepClick,
}: {
  block: Extract<FlowBlock, { kind: "fork" }>;
  onStepClick: (step: OrchestrationStep) => void;
}) {
  const n = block.branches.length;
  const colWidths = block.branches.map((b) => blocksWidth(b.blocks));
  const totalWidth =
    colWidths.reduce((a, w) => a + w, 0) + Math.max(0, n - 1) * BRANCH_GAP;
  const centers: number[] = [];
  let x = 0;
  colWidths.forEach((w) => {
    centers.push(x + w / 2);
    x += w + BRANCH_GAP;
  });
  const anySkipped = block.branches.map((b) => branchIsSkipped(b));

  return (
    <div className="flex flex-col items-center">
      <GatewayDiamond step={block.gateway} role="gateway" />
      <ForkRail totalWidth={totalWidth} centers={centers} skipped={anySkipped} />
      <div className="flex flex-row items-stretch" style={{ gap: BRANCH_GAP }}>
        {block.branches.map((branch, i) => (
          <BranchColumn
            key={`${branch.connection.from}-${branch.connection.to}-${i}`}
            branch={branch}
            width={colWidths[i]}
            skipped={anySkipped[i]}
            onStepClick={onStepClick}
          />
        ))}
      </div>
      {block.converge && (
        <>
          <MergeRail totalWidth={totalWidth} centers={centers} skipped={anySkipped} />
          <GatewayDiamond step={block.converge} role="converge" />
        </>
      )}
    </div>
  );
}

// Width (px) a block occupies: a linear column is one step wide; a fork is as
// wide as its branch columns + gaps. Recursion mirrors the render tree.
function blocksWidth(blocks: FlowBlock[]): number {
  return Math.max(STEP_WIDTH, ...blocks.map(blockWidth));
}
function blockWidth(block: FlowBlock): number {
  if (block.kind === "linear") return STEP_WIDTH;
  const n = block.branches.length;
  const sum = block.branches.reduce((a, b) => a + blocksWidth(b.blocks), 0);
  return Math.max(STEP_WIDTH, sum + Math.max(0, n - 1) * BRANCH_GAP);
}

// One branch: a condition/default chip, then the branch's recursive sub-flow,
// then a flex-grow tail line so all branch bottoms align at the merge rail.
function BranchColumn({
  branch,
  width,
  skipped,
  onStepClick,
}: {
  branch: FlowBranch;
  width: number;
  skipped: boolean;
  onStepClick: (step: OrchestrationStep) => void;
}) {
  return (
    <div
      className={`flex flex-col items-center ${skipped ? "opacity-60" : ""}`}
      style={{ width }}
    >
      <BranchChip connection={branch.connection} skipped={skipped} />
      <ConnectorLine dashed={skipped} />
      <FlowBlocks blocks={branch.blocks} onStepClick={onStepClick} />
      {/* Tail to the merge rail — grows so unequal-length branches still align. */}
      <span
        className={`block w-px flex-1 min-h-[16px] ${
          skipped ? "border-l border-dashed border-[#d3d3dd]" : "bg-[#d3d3dd]"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}

// A branch's edge condition, rendered as a pill at the top of the column.
function BranchChip({
  connection,
  skipped,
}: {
  connection: OrchestrationConnection;
  skipped: boolean;
}) {
  const label = connection.is_default
    ? "default"
    : connection.condition ?? "";
  if (!label) return <span className="h-1.5" aria-hidden="true" />;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-none max-w-full truncate ${
        connection.is_default
          ? "border-dashed border-[#c8c8d3] text-muted-foreground bg-card"
          : "border-[#d3d3dd] bg-card text-foreground font-medium"
      } ${skipped ? "italic" : ""}`}
      title={label}
    >
      {label}
    </span>
  );
}

function branchIsSkipped(branch: FlowBranch): boolean {
  // A branch reads as "not taken" when every step in it is skipped.
  const steps = branch.blocks.flatMap(collectBlockSteps);
  return steps.length > 0 && steps.every((s) => s.status === "skipped");
}

function collectBlockSteps(block: FlowBlock): OrchestrationStep[] {
  if (block.kind === "linear") return block.steps;
  const inner = block.branches.flatMap((b) => b.blocks.flatMap(collectBlockSteps));
  return [
    block.gateway,
    ...inner,
    ...(block.converge ? [block.converge] : []),
  ];
}

function stepTypeLabel(stepType: OrchestrationStepType): string {
  switch (stepType) {
    case "start":
      return "Start process";
    case "resume":
      return "Resume process";
    case "gateway":
      return "Gateway";
    case "converge":
      return "Merge";
    case "process":
    default:
      return "Process step";
  }
}

// ---------- Gateway / converge diamond ----------
//
// Mirrors the real OE Digital-Process gateway node: a diamond with a
// subtype-specific inner glyph (exclusive = ✕, parallel = ✚, inclusive = ◯)
// and a caption below. Converge reuses the diamond with a merge glyph and the
// "Merge" label. The diamond stroke is tinted by status, matching the card
// status rings.

function GatewayDiamond({
  step,
  role,
}: {
  step: OrchestrationStep;
  role: "gateway" | "converge";
}) {
  const subtype = role === "converge" ? "converge" : gatewaySubtype(step);
  const stroke = diamondStroke(step.status);
  const caption =
    step.label ||
    (role === "converge" ? "Merge" : `${capitalize(subtype)} gateway`);
  return (
    <div
      data-prep-id={`process-orchestration-flow-step-${step.id}`}
      data-status={step.status}
      data-step-type={step.step_type}
      className="flex flex-col items-center gap-1"
    >
      <span className="inline-flex items-center justify-center" aria-hidden="true">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <path
            d="M26 2 50 26 26 50 2 26Z"
            fill="#ffffff"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none">
            {gatewayGlyph(subtype)}
          </g>
        </svg>
      </span>
      <span className="text-[11px] text-muted-foreground text-center max-w-[160px] leading-tight truncate" title={caption}>
        {caption}
      </span>
    </div>
  );
}

function gatewayGlyph(
  subtype: "exclusive" | "parallel" | "inclusive" | "converge",
): JSX.Element {
  switch (subtype) {
    case "parallel":
      // ✚ — all paths taken (AND).
      return <path d="M26 17 V35 M17 26 H35" />;
    case "inclusive":
      // ◯ — one or more paths (OR).
      return <circle cx="26" cy="26" r="7" />;
    case "converge":
      // ∨ funnel — branches merge downward.
      return <path d="M19 21 L26 30 L33 21 M26 30 V35" />;
    case "exclusive":
    default:
      // ✕ — exactly one path (XOR).
      return <path d="M20 20 L32 32 M32 20 L20 32" />;
  }
}

function diamondStroke(status: OrchestrationStatus): string {
  switch (status) {
    case "current":
      return "#3858e9";
    case "complete":
      return "#26815a";
    case "failed":
      return "#cb2d3c";
    case "skipped":
      return "#c8c8d3";
    case "pending":
    default:
      return "#98a2b3";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Fork / merge SVG rails ----------
//
// The fork rail drops from the gateway center to a horizontal bus, then down
// to each branch center. The merge rail is its vertical mirror. Both scale
// with the canvas zoom (they live inside the transformed container).

function ForkRail({
  totalWidth,
  centers,
  skipped,
}: {
  totalWidth: number;
  centers: number[];
  skipped: boolean[];
}) {
  return <Rail totalWidth={totalWidth} centers={centers} skipped={skipped} variant="fork" />;
}

function MergeRail({
  totalWidth,
  centers,
  skipped,
}: {
  totalWidth: number;
  centers: number[];
  skipped: boolean[];
}) {
  return <Rail totalWidth={totalWidth} centers={centers} skipped={skipped} variant="merge" />;
}

function Rail({
  totalWidth,
  centers,
  skipped,
  variant,
}: {
  totalWidth: number;
  centers: number[];
  skipped: boolean[];
  variant: "fork" | "merge";
}) {
  const mid = totalWidth / 2;
  const railY = RAIL_HEIGHT / 2;
  const hubY = variant === "fork" ? 0 : RAIL_HEIGHT;
  const branchY = variant === "fork" ? RAIL_HEIGHT : 0;
  const leftMost = Math.min(...centers, mid);
  const rightMost = Math.max(...centers, mid);
  return (
    <svg
      width={totalWidth}
      height={RAIL_HEIGHT}
      viewBox={`0 0 ${totalWidth} ${RAIL_HEIGHT}`}
      className="block"
      aria-hidden="true"
    >
      {/* hub stub: gateway/converge center ↔ bus */}
      <line x1={mid} y1={hubY} x2={mid} y2={railY} stroke="#d3d3dd" strokeWidth="1" />
      {/* horizontal bus spanning the branch centers */}
      <line x1={leftMost} y1={railY} x2={rightMost} y2={railY} stroke="#d3d3dd" strokeWidth="1" />
      {/* one drop per branch center */}
      {centers.map((cx, i) => (
        <line
          key={i}
          x1={cx}
          y1={railY}
          x2={cx}
          y2={branchY}
          stroke="#d3d3dd"
          strokeWidth="1"
          strokeDasharray={skipped[i] ? "3 3" : undefined}
        />
      ))}
    </svg>
  );
}

// ---------- Step card ----------

function StepCard({
  step,
  stepTypeLabel,
  onClick,
}: {
  step: OrchestrationStep;
  stepTypeLabel: string;
  onClick: () => void;
}) {
  const headerIcon = stepTypeIcon(step.step_type);
  // `actor: form` steps are intentionally NOT clickable in v1 — the webform
  // popup is built but disabled until the submit-flow narrative is finalized.
  const isClickable = step.actor === "agent" && Boolean(step.external_url);

  const onCardClick = () => {
    if (isClickable) onClick();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isClickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  // Same border + slight shadow on every card. On hover, an OUTSIDE 2px
  // Celonis-blue outline wraps the full card. Outline (not ring-inset) is
  // used so the indicator isn't covered by the header band's own
  // background — the parent's box-shadow ring is painted over by child
  // backgrounds, leaving only the gap between the two visible.
  const baseClasses =
    "w-full rounded-xl bg-card overflow-hidden flex flex-col border border-[#d3d3dd] shadow-sm transition-shadow hover:shadow-md hover:outline hover:outline-2 hover:outline-[#3858e9] hover:outline-offset-0";
  const dimClass = step.status === "skipped" ? "opacity-60" : "";
  const cursorClass = isClickable ? "cursor-pointer" : "";

  return (
    <div
      data-prep-id={`process-orchestration-flow-step-${step.id}`}
      data-status={step.status}
      data-step-type={step.step_type}
      data-actor={step.actor}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={onKeyDown}
      className={`${baseClasses} ${dimClass} ${cursorClass}`}
    >
      <div className="bg-[#f8f9fa] border-b border-[#e6e6ec] px-4 py-2.5 flex flex-row items-center gap-2.5">
        <span className="flex-shrink-0 text-foreground" aria-hidden="true">
          {headerIcon}
        </span>
        <span className="text-[14px] font-semibold text-foreground leading-tight truncate flex-1 min-w-0">
          {stepTypeLabel}
        </span>
        <StatusPill status={step.status} />
        <KebabMenu />
      </div>
      <div className="px-4 py-3.5 flex flex-row items-center gap-3">
        <BodyAvatar step={step} />
        <span
          title={step.label}
          className="text-[14px] font-semibold text-foreground leading-tight truncate flex-1 min-w-0"
        >
          {step.label}
        </span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OrchestrationStatus }) {
  const label = statusLabel(status);
  const classes = statusPillClasses(status);
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none flex-shrink-0 ${classes}`}
    >
      {statusPillIcon(status)}
      {label}
    </span>
  );
}

function statusLabel(status: OrchestrationStatus): string | null {
  switch (status) {
    case "complete":
      return "Done";
    case "current":
      return "Running";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    case "pending":
    default:
      return null;
  }
}

function statusPillClasses(status: OrchestrationStatus): string {
  switch (status) {
    case "complete":
      return "bg-[#e8f3ee] text-[#26815a]";
    case "current":
      return "bg-[#e7ecfd] text-[#3858e9]";
    case "failed":
      return "bg-[#fbe6e8] text-[#cb2d3c]";
    case "skipped":
      return "bg-[#f1f1f4] text-muted-foreground";
    case "pending":
    default:
      return "";
  }
}

function statusPillIcon(status: OrchestrationStatus): JSX.Element | null {
  if (status === "complete") {
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "current") {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-[#3858e9]"
        aria-hidden="true"
      />
    );
  }
  if (status === "failed") {
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

// ---------- 3-dot menu (decorative) ----------

function KebabMenu() {
  // Renders the OE Studio header-band 3-dot affordance. Decorative — the
  // prototype has no real menu to open. Inert button so screen readers
  // skip it cleanly.
  return (
    <span
      className="flex-shrink-0 inline-flex items-center justify-center text-muted-foreground"
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="3" cy="8" r="1.2" />
        <circle cx="8" cy="8" r="1.2" />
        <circle cx="13" cy="8" r="1.2" />
      </svg>
    </span>
  );
}

// ---------- Connector ----------

function ConnectorLine({ dashed = false }: { dashed?: boolean }) {
  // Thin grey vertical line connecting two cards. ~40px tall to match real
  // OE Studio's between-step gap. `dashed` marks a not-taken (skipped) branch
  // path. The "+ add step" affordance the real product shows is intentionally
  // omitted — the demo is read-only.
  if (dashed) {
    return (
      <span
        className="block w-px h-[40px] border-l border-dashed border-[#d3d3dd]"
        aria-hidden="true"
      />
    );
  }
  return <span className="block w-px h-[40px] bg-[#d3d3dd]" aria-hidden="true" />;
}

// ---------- Icons ----------
//
// Inline SVG only (matches existing components' dependency-free convention).
// All icons sized at 14px for header, 12-14px for body avatar — Inter via
// inheritance, no fontFamily overrides per build-rules § 3.

function stepTypeIcon(stepType: OrchestrationStepType): JSX.Element {
  // Header band icon — verbatim SVG paths from real OE Studio chrome.
  //   - start  / resume → arrow-down-into-circle (signal-receipt glyph)
  //   - process         → two-square branch glyph (action-flow flow icon)
  if (stepType === "start" || stepType === "resume") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          fill="currentColor"
          d="M12 2a.75.75 0 0 1 .75.75v9.256l3.484-3.3a.75.75 0 1 1 1.032 1.088l-4.75 4.5a.75.75 0 0 1-1.032 0l-4.75-4.5a.75.75 0 0 1 1.032-1.088l3.484 3.3V2.75A.75.75 0 0 1 12 2m0 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0-1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"
        />
      </svg>
    );
  }
  // process — two-square branch icon (verbatim from OE Studio)
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        fill="currentColor"
        d="M5.248 2.996a2.25 2.25 0 0 0-2.25 2.25v2.507a2.25 2.25 0 0 0 2.25 2.25h.502v3.707a1 1 0 0 0-.134.116l-2.792 2.791a1.25 1.25 0 0 0 0 1.768l2.792 2.792a1.25 1.25 0 0 0 1.768 0l2.79-2.792q.064-.064.117-.134h3.714v.504a2.25 2.25 0 0 0 2.25 2.25h2.494a2.25 2.25 0 0 0 2.25-2.25V16.25a2.25 2.25 0 0 0-2.25-2.25h-2.494a2.25 2.25 0 0 0-2.25 2.25v.5H10.29a1 1 0 0 0-.116-.134l-2.79-2.79a1 1 0 0 0-.134-.117v-3.707h.505a2.25 2.25 0 0 0 2.25-2.25V5.246a2.25 2.25 0 0 0-2.25-2.25zm-.75 2.25a.75.75 0 0 1 .75-.75h2.507a.75.75 0 0 1 .75.75v2.507a.75.75 0 0 1-.75.75H5.248a.75.75 0 0 1-.75-.75zM4.06 17.501 6.5 15.063l2.437 2.438L6.5 19.94zm12.194-2h2.494a.75.75 0 0 1 .75.75v2.504a.75.75 0 0 1-.75.75h-2.494a.75.75 0 0 1-.75-.75V16.25a.75.75 0 0 1 .75-.75"
      />
    </svg>
  );
}

// ---------- Body avatar ----------
//
// In OE Studio the body avatar is driven by step_type, not actor:
//   - start / resume → radar-pulse glyph (signal indicator) inside a 24px
//                      neutral circle. Same shape for both — both are
//                      "signal received" markers.
//   - process        → AF connector stack: 3 small colored squares + "+ N"
//                      hint, mimicking the connector-icon row inside the
//                      Action Flow that this Process step composes.
// Per-actor subtle color hints distinguish form / system / agent / ai
// process steps (form=light grey; system=blue+orange; agent=purple+blue;
// ai=blue) so the demo still reads the actor distinction without inventing
// new patterns.

function BodyAvatar({ step }: { step: OrchestrationStep }) {
  if (step.step_type === "start" || step.step_type === "resume") {
    return (
      <span
        className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#eef0f4] text-foreground"
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            fill="currentColor"
            d="M12 4.5a8.5 8.5 0 0 0-6.016 14.505.75.75 0 0 1-1.061 1.06A9.97 9.97 0 0 1 2 13C2 7.477 6.477 3 12 3s10 4.477 10 10a9.97 9.97 0 0 1-2.923 7.065.75.75 0 0 1-1.061-1.06A8.5 8.5 0 0 0 12 4.5M12 8a5 5 0 0 0-3.534 8.537.75.75 0 0 1-1.06 1.061 6.5 6.5 0 1 1 9.188 0 .75.75 0 0 1-1.06-1.06A5 5 0 0 0 12 8m0 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M11 13a1 1 0 1 1 2 0 1 1 0 0 1-2 0"
          />
        </svg>
      </span>
    );
  }
  return <ActionFlowStack actor={step.actor} system={step.system} />;
}

// ---------- Action Flow connector stack ----------
//
// Mirrors OE Studio's `action-flow-module-icon-stack` chrome: a row of small
// rounded square tiles, each one a connector icon used by the AF this
// Process step composes, followed by a "+ N" pill counting the rest. Each
// tile carries a colored background and a centered glyph.
//
// We have no real connector inventory in the prototype, so the tile set is
// authored per actor with hues that hint at the actor distinction:
//   - form   → Celonis (black) + Forms (green check) + Celonis (black)
//   - system → Celonis (black) + SAP-blue (S) + Celonis (black)
//   - agent  → Celonis (black) + Copilot (purple) + Celonis (black)
//   - ai     → Celonis (black) + AI (purple sparkle) + Celonis (black)
// All variants close with a "+ 6" pill — same pattern OE Studio uses to
// indicate the rest of the AF connectors are hidden behind the stack.

interface AfTile {
  /** Tile background fill. */
  bg: string;
  /** Tile foreground (for the glyph stroke/fill). */
  fg: string;
  /** Glyph kind — used as the SVG fallback if the PNG can't load. */
  glyph:
    | "celonis-c"
    | "builtin-cog"
    | "sap-s"
    | "oracle-o"
    | "snowflake"
    | "workday-w"
    | "salesforce-sf"
    | "copilot"
    | "ai-sparkle";
  /** Optional. Path under /public to the real OE Studio package PNG.
   *  When set, the tile renders the PNG on top of the colored background;
   *  if it fails to load, the SVG glyph shows through. Drop matching files
   *  into `app/public/oe-icons/` to upgrade tiles to the real product art:
   *    - /oe-icons/celonis_64.png
   *    - /oe-icons/builtin_64.png
   *    - /oe-icons/celonis-demo-sap2_64.png
   */
  pngUrl?: string;
}

/**
 * `actor: "system"` steps default to the SAP tile, then get swapped to a
 * different vendor tile if the step's free-text `system` field (e.g.
 * "Oracle EBS", "SAP S/4HANA · Celonis KM") names a vendor we recognize.
 * To add a new vendor: drop a 64px PNG into `app/public/oe-icons/` and add
 * one entry here — no other code needs to change.
 */
const SYSTEM_VENDOR_TILES: { keyword: string; tile: AfTile }[] = [
  {
    keyword: "oracle",
    tile: {
      bg: "#c74634",
      fg: "#ffffff",
      glyph: "oracle-o",
      pngUrl: "/oe-icons/oracle_64.png",
    },
  },
  {
    keyword: "snowflake",
    tile: {
      bg: "#29b5e8",
      fg: "#ffffff",
      glyph: "snowflake",
      pngUrl: "/oe-icons/snowflake_64.png",
    },
  },
  {
    keyword: "workday",
    tile: {
      bg: "#0875e1",
      fg: "#ffffff",
      glyph: "workday-w",
      pngUrl: "/oe-icons/workday_64.png",
    },
  },
  {
    keyword: "salesforce",
    tile: {
      bg: "#00a1e0",
      fg: "#ffffff",
      glyph: "salesforce-sf",
      pngUrl: "/oe-icons/salesforce_64.png",
    },
  },
];

const SAP_TILE: AfTile = {
  bg: "#1c62bc",
  fg: "#ffffff",
  glyph: "sap-s",
  pngUrl: "/oe-icons/celonis-demo-sap2_64.png",
};

function resolveSystemTile(system?: string): AfTile {
  if (!system) return SAP_TILE;
  const lower = system.toLowerCase();
  const match = SYSTEM_VENDOR_TILES.find(({ keyword }) =>
    lower.includes(keyword)
  );
  return match ? match.tile : SAP_TILE;
}

function actionFlowStackTiles(
  actor: OrchestrationActor,
  system?: string
): AfTile[] {
  const celonis: AfTile = {
    bg: "#000000",
    fg: "#ffffff",
    glyph: "celonis-c",
    pngUrl: "/oe-icons/celonis_64.png",
  };
  switch (actor) {
    case "form":
      return [
        celonis,
        {
          bg: "#a1d36e",
          fg: "#0a1f44",
          glyph: "builtin-cog",
          pngUrl: "/oe-icons/builtin_64.png",
        },
        celonis,
      ];
    case "system":
      return [celonis, resolveSystemTile(system), celonis];
    case "agent":
      return [
        celonis,
        {
          bg: "#5059c9",
          fg: "#ffffff",
          glyph: "copilot",
          pngUrl: "/oe-icons/celonis-demo-teams_64.png",
        },
        celonis,
      ];
    case "ai":
      return [
        celonis,
        { bg: "#7c3aed", fg: "#ffffff", glyph: "ai-sparkle" },
        celonis,
      ];
    case "human":
    case "trigger":
    default:
      return [celonis, celonis, celonis];
  }
}

function ActionFlowStack({
  actor,
  system,
}: {
  actor: OrchestrationActor;
  system?: string;
}) {
  const tiles = actionFlowStackTiles(actor, system);
  return (
    <span
      className="flex-shrink-0 inline-flex items-center"
      aria-hidden="true"
    >
      <span className="inline-flex items-center">
        {tiles.map((tile, i) => (
          <AfTileChip key={i} tile={tile} />
        ))}
        <span className="inline-flex items-center justify-center h-7 px-1.5 rounded-md border border-[#d3d3dd] bg-white text-foreground text-[11px] font-semibold leading-none ml-1">
          + 6
        </span>
      </span>
    </span>
  );
}

function AfTileChip({ tile }: { tile: AfTile }) {
  // Render the PNG on top of the colored background. If it can't load
  // (missing file, network error), `useImageWithFallback` flips us back to
  // the inline SVG glyph so the tile is never blank.
  const [imgFailed, setImgFailed] = useState(false);
  const showPng = Boolean(tile.pngUrl) && !imgFailed;
  return (
    <span
      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border-2 border-card -mr-1 last:mr-0 overflow-hidden"
      style={{ backgroundColor: tile.bg, color: tile.fg }}
    >
      {showPng ? (
        <img
          src={tile.pngUrl}
          alt=""
          className="block h-[18px] w-[18px] object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        afTileGlyph(tile.glyph)
      )}
    </span>
  );
}

function afTileGlyph(glyph: AfTile["glyph"]): JSX.Element {
  switch (glyph) {
    case "celonis-c":
      // Stylized Celonis "c" mark — circular outline with an inner dot, sized
      // to fit the 28px tile cleanly.
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "builtin-cog":
      // Builtin connector — gear/cog glyph (matches OE Studio's green
      // "builtin" tile).
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            fill="currentColor"
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7m-1.8 3.5a1.8 1.8 0 1 1 3.6 0 1.8 1.8 0 0 1-3.6 0M11 2a1 1 0 0 0-1 1v1.18a8 8 0 0 0-2.04.84L7.13 4.2a1 1 0 0 0-1.41 0L4.2 5.72a1 1 0 0 0 0 1.41l.83.83A8 8 0 0 0 4.18 10H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1.18a8 8 0 0 0 .85 2.04l-.83.83a1 1 0 0 0 0 1.41l1.52 1.52a1 1 0 0 0 1.41 0l.83-.83a8 8 0 0 0 2.04.85V21a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1.18a8 8 0 0 0 2.04-.85l.83.83a1 1 0 0 0 1.41 0l1.52-1.52a1 1 0 0 0 0-1.41l-.83-.83A8 8 0 0 0 19.82 14H21a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1.18a8 8 0 0 0-.85-2.04l.83-.83a1 1 0 0 0 0-1.41L18.28 4.2a1 1 0 0 0-1.41 0l-.83.83A8 8 0 0 0 14 4.18V3a1 1 0 0 0-1-1z"
          />
        </svg>
      );
    case "sap-s":
      // SAP-ish "S" letter on the blue tile.
      return (
        <span className="text-[12px] font-bold leading-none">S</span>
      );
    case "oracle-o":
      // Oracle-ish "O" letter fallback.
      return (
        <span className="text-[12px] font-bold leading-none">O</span>
      );
    case "snowflake":
      // Generic snowflake glyph (six-point asterisk).
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11"
          />
        </svg>
      );
    case "workday-w":
      // Workday-ish "W" letter fallback.
      return (
        <span className="text-[11px] font-bold leading-none">W</span>
      );
    case "salesforce-sf":
      // Salesforce-ish "sf" letters fallback.
      return (
        <span className="text-[10px] font-bold leading-none">sf</span>
      );
    case "copilot":
      // Microsoft Copilot ribbon glyph — stylized infinity / ribbon.
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            fill="currentColor"
            d="M7.5 6.5C5 6.5 3 8.5 3 11s2 4.5 4.5 4.5c1.5 0 2.8-.7 3.6-1.8.5.7 1.4 1.8 3.4 1.8 2.5 0 4.5-2 4.5-4.5s-2-4.5-4.5-4.5c-1.5 0-2.7.7-3.5 1.7C10.4 7.2 9.5 6.5 7.5 6.5"
          />
        </svg>
      );
    case "ai-sparkle":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            fill="currentColor"
            d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"
          />
        </svg>
      );
  }
}
