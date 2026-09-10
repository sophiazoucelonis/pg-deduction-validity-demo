/**
 * ValueStreamMap — Beat 2 / L1 value-chain opener.
 *
 * Horizontal phase strip: 5–7 phase cards laid side-by-side with thin
 * arrow separators between them, suggesting the end-to-end process flow.
 * Each phase card is a compact, vertically-stacked KPI tile (Celonis Studio
 * KPI-overview pattern, see KpiList.tsx): phase label at the top, 1–3 KPIs
 * (Volume / Attributed / Cycle Time) stacked vertically, lever button at
 * the bottom.
 *
 * Lever buttons use the canonical Emotion classes `ce-button-primary`
 * (priority lever — exactly one per Beat 2) and `ce-button-secondary`
 * (other phases). Null-route levers render with the same className but as
 * a plain <span>, so they share the visual treatment without being
 * interactive.
 *
 * The strategic outcome header anchors the screen at the top: title +
 * outcome name + timeframe on the left, and a horizontal row of metrics on
 * the right (headline metric current → goal, plus optional end-to-end
 * cycle and on-time rate from `summary`). The phase strip fills the
 * remaining viewport height.
 *
 * Self-wrapping (registered in SELF_WRAPPING_KINDS): each section carries
 * its own card chrome.
 */

import type {
  ValueStreamMapSpec,
  ValueStreamMapNarrative,
  ValueChainPhase,
} from "@/types/screen-instance";
import { useNavigate } from "react-router-dom";
import { useDemoBasePath } from "@/lib/demo-paths";

export interface ValueStreamMapProps {
  spec: ValueStreamMapSpec;
}

export function ValueStreamMap({ spec }: ValueStreamMapProps) {
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <Header spec={spec} />
      <PhaseStrip phases={spec.phases} />
      {spec.narrative && <NarrativeBlock narrative={spec.narrative} />}
    </div>
  );
}

function Header({ spec }: { spec: ValueStreamMapSpec }) {
  const { headline_metric: m, name, timeframe } = spec.strategic_outcome;
  return (
    <div className="rounded-xl border border-[#d3d3dd] bg-card px-6 py-5 flex flex-row items-center gap-8 flex-shrink-0">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight truncate">
          {spec.title}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed truncate">
          <span className="font-semibold text-foreground">{name}</span>
          {timeframe && <span> · {timeframe}</span>}
        </p>
      </div>
      <div className="flex flex-col gap-1 items-end flex-shrink-0">
        <span className="text-[13px] leading-tight font-normal text-muted-foreground">
          {m.label}
        </span>
        <span className="text-[28px] leading-[1.05] font-normal tracking-tight text-foreground flex items-baseline gap-2 whitespace-nowrap">
          <span>{m.current}</span>
          <span className="text-[18px] text-muted-foreground">→</span>
          <span className="text-muted-foreground">{m.goal}</span>
        </span>
      </div>
    </div>
  );
}

function PhaseStrip({ phases }: { phases: ValueChainPhase[] }) {
  return (
    <div className="flex flex-row items-stretch gap-0 flex-shrink-0">
      {phases.map((phase, idx) => (
        <div
          key={phase.id}
          className="flex flex-row items-stretch flex-1 min-w-0"
        >
          <PhaseCard phase={phase} />
          {idx < phases.length - 1 && <PhaseArrow />}
        </div>
      ))}
    </div>
  );
}

function PhaseCard({ phase }: { phase: ValueChainPhase }) {
  const items: { name: string; value: string; accent?: string }[] = [];
  if (phase.count) items.push({ name: "Volume", value: phase.count });
  if (phase.value_attributed)
    items.push({
      name: "Attributed",
      value: phase.value_attributed,
      accent: phase.color,
    });
  if (phase.cycle_time) items.push({ name: "Cycle Time", value: phase.cycle_time });

  return (
    <div
      data-prep-id={`value-stream-map-phase-${phase.id}`}
      className="rounded-xl border border-[#d3d3dd] bg-card px-5 py-6 flex flex-col gap-5 flex-1 min-w-0"
    >
      <h3
        title={phase.label}
        className="text-[15px] font-semibold tracking-tight text-foreground leading-tight truncate"
      >
        {phase.label}
      </h3>
      <div className="flex flex-col flex-1 min-h-0 justify-between gap-4">
        {items.map((item) => (
          <div key={item.name} className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] leading-tight font-normal text-muted-foreground truncate uppercase tracking-[0.04em]">
              {item.name}
            </span>
            <span
              title={item.value}
              className="text-[24px] leading-[1.1] font-normal tracking-tight overflow-hidden whitespace-nowrap text-ellipsis"
              style={item.accent ? { color: item.accent } : undefined}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <LeverButton phase={phase} />
    </div>
  );
}

function NarrativeBlock({ narrative }: { narrative: ValueStreamMapNarrative }) {
  return (
    <div className="rounded-xl border border-[#d3d3dd] bg-card px-6 py-5 flex flex-col gap-2 flex-1 min-h-0">
      {narrative.heading && (
        <h4 className="text-base font-semibold text-foreground tracking-tight">
          {narrative.heading}
        </h4>
      )}
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {narrative.body}
      </p>
    </div>
  );
}

function PhaseArrow() {
  return (
    <div
      className="flex items-center justify-center px-1 text-muted-foreground select-none flex-shrink-0"
      aria-hidden="true"
    >
      <span className="text-[20px] leading-none">→</span>
    </div>
  );
}

function LeverButton({ phase }: { phase: ValueChainPhase }) {
  const basePath = useDemoBasePath();
  const navigate = useNavigate();
  const isPriority = phase.lever.is_priority === true;
  const clickable = !!(phase.lever.route && basePath);
  const className = `${
    isPriority ? "ce-button-primary" : "ce-button-secondary"
  } w-full justify-center`;
  const label = phase.lever.action;

  if (clickable) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => navigate(`${basePath}/${phase.lever.route}`)}
      >
        <span className="truncate">{label}</span>
      </button>
    );
  }

  // Null-route lever: identical visual treatment, non-interactive. Plain
  // <span> avoids the disabled-button state the user explicitly rejected.
  return (
    <span className={className} role="presentation">
      <span className="truncate">{label}</span>
    </span>
  );
}
