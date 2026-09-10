/**
 * Component registry — maps a `ViewComponent`'s `kind` discriminator to its
 * React renderer. The single dispatch point: adding a new component class is
 * one entry here plus one renderer file.
 *
 * Each renderer receives the typed component spec via a `spec` prop. The
 * BrandHero renderer also receives the view-level `brand` (logo + colors) so
 * it can render the customer mark without prop-drilling brand into every
 * component.
 */

import type {
  Brand,
  ComponentKind,
  ViewComponent,
} from "@/types/screen-instance";
import { BrandHero } from "./components/BrandHero";
import { KpiCard } from "./components/KpiCard";
import { KpiList } from "./components/KpiList";
import { MiniChartComponent } from "./components/MiniChartComponent";
import { TableComponent } from "./components/TableComponent";
import { ProcessExplorerComponent } from "./components/ProcessExplorerComponent";
import { TextBlock } from "./components/TextBlock";
import { ChartBar } from "./components/ChartBar";
import { ChartLine } from "./components/ChartLine";
import { InsightCardList } from "./components/InsightCardList";
import { CtaRow } from "./components/CtaRow";
import { StatCallout } from "./components/StatCallout";
import { ValueStreamMap } from "./components/ValueStreamMap";
import { ProcessOrchestrationFlow } from "./components/ProcessOrchestrationFlow";
import { ContextModelComponent } from "./components/ContextModelComponent";
import { CelonisStudioCopilot } from "./components/CelonisStudioCopilot";
import { TabGroup } from "./components/TabGroup";
import { ComponentBoundary } from "./ComponentBoundary";

/**
 * Components that render their own bordered card/container. The BoardView's
 * column layout groups CONSECUTIVE non-self-wrapping components into a shared
 * column-card with the column title at the top — matching real Celonis Studio
 * where the kpi-card + chart cluster shares one card and the table sits in a
 * separate card below.
 */
export const SELF_WRAPPING_KINDS: ReadonlySet<ComponentKind> = new Set<ComponentKind>([
  "brand-hero",
  "kpi-list",
  "table",
  "process-explorer",
  "chart-bar",
  "chart-line",
  "insight-card-list",
  "stat-callout",
  "value-stream-map",
  "process-orchestration-flow",
  "context-model",
  "celonis-studio-copilot",
  "tab-group",
  // `cta-row` is a bare row of buttons, no card chrome of its own. Treating
  // it as self-wrapping prevents BoardView from putting it in an extra
  // bordered + padded "column card" with the leading gap that creates.
  "cta-row",
]);

export function isSelfWrapping(component: ViewComponent): boolean {
  if (SELF_WRAPPING_KINDS.has(component.kind)) return true;
  // A `text-block` normally wants BoardView's bordered column-card (it's
  // used as a section header above a table/cta-row) — but a per-instance
  // `bare: true` opts a single text-block out, for a plain subtitle line
  // that shouldn't read as its own boxed card.
  return component.kind === "text-block" && component.bare === true;
}

/**
 * Compact components render at natural height inside multi-component bare
 * groups instead of flex-growing. Tables, charts, and process explorers
 * absorb remaining space; stat-callouts and CTA rows stay small.
 */
const COMPACT_KINDS: ReadonlySet<ComponentKind> = new Set<ComponentKind>([
  "brand-hero",
  "stat-callout",
  "cta-row",
]);

export function isCompact(kind: ComponentKind): boolean {
  return COMPACT_KINDS.has(kind);
}

/**
 * Canvas components that render their own full-height pan/zoom surface and need
 * the board to be fixed to the viewport height (so their `h-full` chain
 * resolves). A board hosting one of these is "viewport-fit"; a board of content
 * tiles (cards, charts, tables) is not — it should flow and let the page scroll
 * when the window is short. See BoardView's flow-vs-fit decision.
 */
const VIEWPORT_FILL_KINDS: ReadonlySet<ComponentKind> = new Set<ComponentKind>([
  "process-explorer",
  "value-stream-map",
  "process-orchestration-flow",
  "context-model",
  "celonis-studio-copilot",
]);

export function isViewportFill(kind: ComponentKind): boolean {
  return VIEWPORT_FILL_KINDS.has(kind);
}

export interface ComponentRenderContext {
  brand?: Brand;
  /**
   * True when the component is rendered inside a column of a multi-column
   * board view (as opposed to a single full-canvas view). Components can
   * adapt their density / chrome to the constrained context — e.g. Process
   * Explorer applies a smaller initial zoom so its cards/text feel
   * proportional to the surrounding page typography.
   */
  composed?: boolean;
}

/**
 * Per-tile render dispatch. Wrapped by `renderComponent` in a
 * `ComponentBoundary` so one fragile component degrades to an error card
 * instead of white-screening the whole demo.
 */
function renderComponentInner(
  component: ViewComponent,
  ctx: ComponentRenderContext = {},
): JSX.Element {
  switch (component.kind) {
    case "brand-hero":
      return <BrandHero spec={component} brand={ctx.brand} />;
    case "kpi-card":
      return <KpiCard spec={component} />;
    case "kpi-list":
      return <KpiList spec={component} />;
    case "mini-chart":
      return <MiniChartComponent spec={component} />;
    case "text-block":
      return <TextBlock spec={component} />;
    case "chart-bar":
      return <ChartBar spec={component} />;
    case "chart-line":
      return <ChartLine spec={component} />;
    case "insight-card-list":
      return <InsightCardList spec={component} />;
    case "cta-row":
      return <CtaRow spec={component} />;
    case "stat-callout":
      return <StatCallout spec={component} />;
    case "table":
      return <TableComponent spec={component} />;
    case "process-explorer":
      return <ProcessExplorerComponent spec={component} composed={ctx.composed} />;
    case "value-stream-map":
      return <ValueStreamMap spec={component} />;
    case "process-orchestration-flow":
      return <ProcessOrchestrationFlow spec={component} />;
    case "context-model":
      return <ContextModelComponent spec={component} />;
    case "celonis-studio-copilot":
      return <CelonisStudioCopilot spec={component} />;
    case "tab-group":
      return <TabGroup spec={component} />;
    default: {
      const _exhaustive: never = component;
      return (
        <div className="p-4 text-destructive">
          Unknown component kind:{" "}
          <code>{(_exhaustive as { kind?: ComponentKind }).kind ?? "?"}</code>
        </div>
      );
    }
  }
}

export function renderComponent(
  component: ViewComponent,
  ctx: ComponentRenderContext = {},
): JSX.Element {
  return (
    <ComponentBoundary label={component.kind}>
      {renderComponentInner(component, ctx)}
    </ComponentBoundary>
  );
}
