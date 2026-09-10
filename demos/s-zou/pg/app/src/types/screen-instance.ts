/**
 * TypeScript types for Atlas screen instances.
 *
 * The runtime model: a **view** is the navigable thing in the sidebar; a
 * view contains a layout of typed **components** (KPI cards, tables,
 * Process Explorer, etc.) — matching real Celonis Studio's view+component
 * architecture. Today only `view_kind: board` exists, but the discriminator
 * is preserved for future view kinds (Knowledge Model, Action Flow, …).
 *
 * Source of truth: `.claude/skills/demo-screen/assets/screen-instance.schema.yaml`
 * + `.claude/skills/demo-screen/library/types/<view-kind>.yaml`.
 *
 * Adding a new component kind:
 *   1. Define its `<Kind>Spec` interface here, discriminated by `kind`.
 *   2. Add it to the `ViewComponent` union.
 *   3. Register a renderer in `components/board/registry.ts`.
 *   4. Add a per-kind `oneOf` branch to the JSON schema.
 */

export type { ContextModelSpec } from "./context-model";
import type { ContextModelSpec } from "./context-model";

export type Trend = "up" | "down" | "flat";

export type Industry =
  | "automotive_manufacturing"
  | "banking_financial_services"
  | "retail_cpg"
  | "life_sciences_healthcare"
  | "energy"
  | "telco"
  | "manufacturing"
  | "financial_services"
  | "other";

export type ViewKind = "board";

// ---------- Common ----------

export interface Brand {
  name: string;
  /** Public URL to the customer logo (SVG preferred, PNG accepted). Preferred
   *  over `logo_svg` when set — keeps demo YAMLs short and lets us point at
   *  canonical brand assets (e.g. Wikimedia Commons). */
  logo_url?: string;
  /** Inline SVG markup. Fallback when no `logo_url` is available. */
  logo_svg?: string;
  primary_color: string;
}

export interface TopMetric {
  name: string;
  value: string;
  /** Visual emphasis. `positive` = green text + a small up-arrow next to the
   *  value. Used for delta / uplift KPIs (e.g. "+6 pp OEE Uplift Potential").
   *  Default = neutral. Do not add other tones — filled-color KPI tiles are
   *  not part of Emotion design. */
  tone?: "positive";
  /** Tooltip text shown on hover of a small info icon next to the KPI name.
   *  Standard use: explain the calculation behind a value-opportunity KPI. */
  tooltip?: string;
}

// ---------- View shapes ----------

interface BaseView {
  id: string;
  view_kind: ViewKind;
  library_ref: string | null;
  industry: Industry;
  framing: string;
  domain: string;
  /** H1 page title + label shown in the second-level sidebar. */
  title: string;
  brand?: Brand;
  breadcrumbs?: string[];
  /**
   * Screen-YAML schema version, stamped by `demo-yaml` at generation. Drives
   * migrate-on-read (`@/lib/schema-migrations`): the app upgrades old shapes to
   * `CURRENT_SCHEMA_VERSION` in memory at load. Absent ⇒ treated as version 1
   * (demos generated before versioning).
   */
  schema_version?: number;
  generated_by?: string;
  generated_at?: string;
  /**
   * Optional notes for the V/E during the demo. V2 renders these in the
   * preparation-mode sidebar; V1 stores the data but does not render.
   */
  presenter_notes?: string;
  /**
   * Optional hotspots — ordered click targets the presenter should hit.
   * V2 renders as on-canvas highlights in preparation mode; V1 stores only.
   */
  hotspots?: { selector?: string; label: string; order: number }[];
  /**
   * Presentation mode. Default ("full") = render edge-to-edge inside the
   * AssetViewer chrome. "overlay" = open as a slide-out panel from the
   * right edge over the underlying view. Detailed case overviews in
   * Operate-Apps use "overlay" so the planner can drill in without losing
   * context. Overlay views are hidden from the sidebar nav (still
   * reachable via direct URL for debugging).
   */
  display_mode?: "full" | "overlay";
}

export interface BoardView extends BaseView {
  view_kind: "board";
  /**
   * When true, the board renders a single component edge-to-edge with no
   * hero / column chrome / page padding. Used for Process Explorer-only
   * screens where the canvas should fill the viewport.
   */
  full_canvas?: boolean;
  /** Optional full-width strip rendered above the columns. */
  hero?: ViewComponent;
  /** Optional centered section label rendered between the hero and the columns. */
  section_label?: string;
  /** Row of side-by-side columns. Within each column, components stack vertically.
   *  Required when `column_groups` is absent; ignored when `column_groups` is set. */
  columns?: BoardColumn[];
  /**
   * Optional multi-group layout. Each group renders as a full-width row of
   * columns with an optional centered label above it. When set, `columns` is
   * ignored — put all columns inside `column_groups` instead.
   * Use for Control Tower-style screens: one group for KPI+chart rows, a
   * second group (with label "Top Opportunities") for the tables below.
   */
  column_groups?: ColumnGroup[];
  /** Optional full-width component rendered below the columns. Used for the
   *  Action View "main table" pattern: KPI strip (hero) → analytics
   *  side-by-side (columns) → main actionable table (footer). */
  footer?: ViewComponent;
}

export interface ColumnGroup {
  /** Optional centered h3 rendered above this row of columns. */
  label?: string;
  /**
   * When true, this row grows to help fill leftover vertical space on a
   * flow-mode board with no canvas component (a board with no
   * process-explorer/value-stream-map/etc., which otherwise just shrinks to
   * its natural content height and leaves blank space below on a tall
   * viewport). Opt-in — omit for rows that should stay at their natural
   * content height (e.g. a thin subtitle/header row).
   */
  grow?: boolean;
  columns: BoardColumn[];
}

export interface BoardColumn {
  /** Optional column header rendered above this column's components. */
  title?: string;
  /** Relative width (any unit; ratios are normalized). Defaults to equal split. */
  width?: number;
  components: ViewComponent[];
}

// ---------- Component specs ----------

export interface BrandHeroSpec {
  kind: "brand-hero";
  title?: string;
  top_metrics?: TopMetric[];
  /**
   * Horizontal (default): logo on the left, metrics inline on the right —
   * the canonical hero strip across the top of a view.
   * Vertical: logo on top, metrics stacked beneath. Used inside narrow
   * columns (e.g. the brand-column of the Process Discovery view).
   */
  orientation?: "horizontal" | "vertical";
}

export interface KpiCardSpec {
  kind: "kpi-card";
  name: string;
  value: string;
  trend?: Trend;
  industry_benchmark?: string;
  potential_value?: string;
}

export interface KpiListSpec {
  kind: "kpi-list";
  items: TopMetric[];
}

export interface MiniChartSpec {
  kind: "mini-chart";
  header_label: string;
  trend?: Trend;
  current_value: number;
  median_value: number;
  world_class_value?: number;
  unit_suffix?: string;
  /** Free-text description/caption shown below the chart. */
  description?: string;
}

export interface TextBlockSpec {
  kind: "text-block";
  heading?: string;
  body?: string;
  level?: "h2" | "h3";
  /**
   * When true, renders without BoardView's default bordered "column card"
   * wrapper — a bare paragraph sitting directly in the layout, the same
   * treatment `cta-row` always gets. Use for a plain subtitle/description
   * line that shouldn't read as its own boxed card (e.g. the intro
   * sentence beside a header button). Default false — most text-blocks
   * (section headers before a table/cta-row) want the card.
   */
  bare?: boolean;
}

export interface ChartSeriesSpec {
  key: string;
  label: string;
  color?: string;
}

export interface ChartBarSpec {
  kind: "chart-bar";
  title?: string;
  description?: string;
  orientation?: "vertical" | "horizontal";
  categories: string[];
  series: ChartSeriesSpec[];
  rows: Record<string, string | number>[];
  stacked?: boolean;
  /**
   * Single-series magnitude ramp: each bar is shaded by its value rank
   * (highest = darkest brand blue, lowest = lightest tint) instead of one
   * flat color — matches the real Celonis "sorted magnitude" bar chart
   * (e.g. an error-count-by-category chart already sorted high→low). Only
   * applies when there is exactly one series and `stacked` is not set;
   * ignored otherwise. A min/max legend chip renders below the chart in
   * place of the normal series legend.
   */
  sequential?: boolean;
  /** Prefix prepended to tick / tooltip values. Use for currency: "$". */
  unit_prefix?: string;
  /** Suffix appended to tick / tooltip values. Use for "%", "M", "hrs". */
  unit_suffix?: string;
}

export interface ChartLineSpec {
  kind: "chart-line";
  title?: string;
  description?: string;
  x_axis: { key: string; label?: string };
  series: ChartSeriesSpec[];
  rows: Record<string, string | number>[];
  unit_suffix?: string;
}

export interface TableColumnSpec {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  bold?: boolean;
  muted?: boolean;
  /**
   * Per-cell render override. Default: plain text.
   * - "badge" wraps the cell value in a colored severity Badge (uses the
   *   sibling `<key>_severity` column on the row to pick high/medium/low/
   *   neutral). Pattern matches the Material Allocation app's red/orange
   *   severity pills.
   * - "sparkles-pill" wraps the cell value in a light AI-derived pill with a
   *   sparkles icon. Used on Optimization Potential / Recovery Potential
   *   columns to signal LLM-aggregated values, mirroring the canonical
   *   Material Allocation app's "Optimization Potential" column.
   * - "link" styles the cell value as a blue underlined link. Use on the
   *   row-identifier column when `row_route_key` is set, so the canonical
   *   Celonis "click the ID to drill into the detail" affordance reads
   *   correctly. Click behavior still comes from the row-level handler.
   */
  render?: "badge" | "sparkles-pill" | "link";
}

export interface TableSpec {
  kind: "table";
  title?: string;
  columns: TableColumnSpec[];
  rows: Record<string, string>[];
  /**
   * Optional CTA button below the table (existing pattern).
   */
  cta?: {
    label: string;
    /** Component slug to navigate to within the current customer (e.g. "process-explorer"). */
    route?: string;
  };
  /**
   * Optional row-level navigation. When set, each row becomes clickable; the
   * value of `row[row_route_key]` is used as the route slug — navigates to
   * `/${customer}/${value}`. Used in the Operate-App Overview where each
   * table row links to a Detail screen.
   */
  row_route_key?: string;
  /** Tighten row padding for compact contexts (e.g. Control Tower lower section). */
  dense?: boolean;
  /**
   * Loosen row padding beyond the default — the table's counterpart to
   * `dense`. Use when the table shares a row with a chart/card that's been
   * grown to fill leftover viewport space (see `ColumnGroup.grow`) and
   * should read as "more spacious" rather than stretching into blank space
   * below the last row. Mutually exclusive with `dense`; `dense` wins if
   * both are set.
   */
  spacious?: boolean;
}

export interface InsightCardSpec {
  /** Numbered headline, e.g. "Reduce Late Payments". Rendered as an H3 inside its own assistant message bubble. */
  headline: string;
  /** 1-2 sentence description. Kept terse — real Celonis paragraphs are too long for a sidebar. */
  description?: string;
  /** Compact label-value pair: the KPI the agent is targeting (e.g. "Late payment rate"). */
  target_metric?: string;
  /** Compact label-value pair: the $ / volume metric (e.g. "Invoice value paid late"). */
  value_metric?: string;
  /** Component-slug to navigate to when the corresponding choice button is clicked. */
  route?: string;
}

export interface InsightCardListSpec {
  kind: "insight-card-list";
  /** Overall panel title, rendered as the first assistant message (e.g. "Identified 5 Opportunities"). */
  title?: string;
  /** Optional intro message rendered before the cards (e.g. an agent-thinking line). */
  intro_message?: string;
  /** The numbered opportunities. */
  cards: InsightCardSpec[];
  /** Final assistant prompt rendered before the choice buttons (default: "Select an opportunity to proceed."). */
  choice_prompt?: string;
  /** Whether to render the choice buttons row at the bottom (default: true). */
  show_choices?: boolean;
}

/**
 * Skill / Action-Flow execution modal — small modal with the Celonis loader
 * + "Executing Action Flow" text, transitions to "Action completed." with
 * a checkmark. Stays open until the user clicks X. Matches the canonical
 * `ce-skill-execution-modal` pattern.
 */
export interface ExecuteSkillModalSpec {
  kind: "execute-skill";
  title: string;
  /** Subtitle pair rendered as "**Label:** Value" under the title (e.g.
   *  `Production Order: PO-784211`). */
  subtitle_label?: string;
  subtitle_value?: string;
  /** Optional in-app route the prototype navigates to once the modal
   *  reaches the success state. Used by Beat 4's primary CTA to hand off
   *  into Beat 5 (`06-orchestration`) after the spinner. When unset
   *  (default for prior demos), the modal stays open until the user
   *  clicks the X. */
  post_action_route?: string;
}

/**
 * Send-email modal — form with a metadata context line, a "To *" email
 * input (optionally pre-filled), and a "Save as new Execution Template"
 * checkbox. Footer has Close + Execute. Clicking Execute closes this and
 * chains to an `ExecuteSkillModalSpec`-style action-flow modal.
 */
export interface SendEmailModalSpec {
  kind: "send-email";
  title: string;
  /** Pipe-separated metadata line shown above the form (e.g. `Production
   *  Order: PO-784211 | Material: Stator Coil | Plant: Erlangen`). */
  context_line?: string;
  to_prefill?: string;
}

export type CtaButtonModalSpec = ExecuteSkillModalSpec | SendEmailModalSpec;

export interface CtaRowButton {
  label: string;
  /** Component slug for in-prototype routing (e.g. "04-operate-app-overview"). */
  route?: string;
  /** Absolute URL for opening another app in a new browser tab (e.g. Copilot Studio). */
  external_url?: string;
  /** Open a Celonis-style modal on click instead of navigating. Used for the
   *  "Trigger Action Flow" / "Send Email" patterns in operate-app detail
   *  views. */
  modal?: CtaButtonModalSpec;
  /** Primary = brand-colored fill (orchestration trigger); secondary = outlined (email/lower-priority). */
  variant?: "primary" | "secondary";
}

export interface CtaRowSpec {
  kind: "cta-row";
  buttons: CtaRowButton[];
}

// ---------- Process Explorer component ----------

export interface ProcessObject {
  id: string;
  label: string;
  count: string;
  color: string;
  /**
   * Marks the focal lane — the one carrying the symptom deviation. Exactly
   * one object per PE should set this. On mount, only the focal lane is
   * visible; upstream lanes are revealed via the eventlog selector.
   */
  is_focal?: boolean;
  /**
   * Marks the AI-agent lane — the object representing the deployed agent
   * itself (its executions: Trigger / Recommend / Accept / Mitigate, etc.),
   * as opposed to a business object the agent acts on (an order, a part).
   * At most one object per PE should set this. On mount it is shown
   * ALONGSIDE the focal lane (not instead of it) — every Enterprise AI
   * Control Center talk track narrates the agent's actions as embedded in
   * the live process, so the agent must never start hidden behind the
   * eventlog selector the way upstream lanes do. Other lanes still start
   * hidden and are revealed via the selector, same as always.
   */
  is_agent?: boolean;
}

export interface ProcessEvent {
  id: string;
  label: string;
  count: string;
  event_count?: string;
  object_ids: string[];
  counts_by_object?: Record<string, string>;
  sync_level?: number;
}

export interface ProcessConnection {
  from_event_id: string;
  to_event_id: string;
  object_id: string;
  count: string;
  throughput_time?: string;
}

export interface KpiOverlay {
  name: string;
  current_value: string;
  benchmark_value: string;
  potential_value?: string;
}

export interface DeviationEvent {
  id: string;
  label: string;
  event_count: string;
  object_id: string;
  side?: "left" | "right";
}

export interface DeviationConnection {
  from_event_id: string;
  to_event_id: string;
  object_id: string;
  count?: string;
  throughput_time?: string;
}

export interface EventDeviation {
  events?: DeviationEvent[];
  connections?: DeviationConnection[];
  spaghetti?: {
    events?: DeviationEvent[];
    connections?: DeviationConnection[];
  };
}

export interface ConnectionDeviation {
  connections?: DeviationConnection[];
  spaghetti?: {
    connections?: DeviationConnection[];
  };
}

export interface ProcessExplorerSpec {
  kind: "process-explorer";
  objects: ProcessObject[];
  events: ProcessEvent[];
  connections: ProcessConnection[];
  kpi_overlay?: KpiOverlay;
  event_deviations?: EventDeviation[];
  connection_deviations?: ConnectionDeviation[];
  /**
   * Override the normal "focal lane only (+ agent lane, if any)" default
   * visibility and show EVERY object lane on mount. Against the standard PE
   * rules (see pe-content-rules.md "Slider sequence") — reserved for
   * screens where the whole point is surveying every connected object at a
   * glance, e.g. the Enterprise AI Control Center's Agent Mining canvas,
   * where the audience should immediately see the agent sitting among ALL
   * the business objects it touches, not just one. Ordinary Process
   * Discovery (Beat 1) PEs should NOT set this — it defeats the
   * progressive-reveal storytelling the slider sequence is built around.
   */
  default_all_visible?: boolean;
}

/**
 * StatCallout — single prominent "label + headline value" tile. Used on deep-
 * dive views to surface aggregated GenAI-record-annotation insights ("Biggest
 * Pattern", "Highest-Impact Cluster"). When `tone: "ai-annotated"` is set, the
 * tile renders a subtle sparkles badge to signal the value comes from
 * record-level LLM annotation rather than a static query.
 */
export interface StatCalloutSpec {
  kind: "stat-callout";
  /** Small caption above the headline value (e.g. "Biggest Pattern"). */
  label: string;
  /** Large headline value — typically the GenAI-derived label or category. */
  value: string;
  /** Optional short plain-text context line below the value. Mutually
   *  exclusive with `secondary_metric` in practice (pick one per tile). */
  caption?: string;
  /**
   * Optional related-metric row below the value: label on the left, a bold
   * value right-aligned, with an optional small directional arrow — matches
   * the real Celonis KPI-tile's related-KPI row (e.g. "FTE Equivalent  3.1
   * FTE ↗"). Neutral ink, not status-colored — the arrow shows direction
   * only, never good/bad.
   */
  secondary_metric?: { label: string; value: string; trend?: Trend };
  /** "ai-annotated" surfaces a small AI/sparkles indicator. */
  tone?: "default" | "ai-annotated";
  /**
   * Optional override for the headline value's text color. Default is dark
   * ink. "brand" uses the app's brand blue (#264aff) — use sparingly, for
   * the one tile a screen wants to draw the eye to first (e.g. the
   * top-of-screen "Hours Saved" hero metric on an AI Control Center
   * overview). Not a status color — never implies good/bad.
   */
  value_color?: "default" | "brand";
}

/**
 * ValueStreamMap — L1 / value-chain opener (Beat 2). Horizontal phase strip
 * anchored to a strategic_outcome band, with one verb-led lever per phase.
 * Exactly one phase carries `lever.is_priority: true` — that lever gets the
 * prep-mode hotspot glow and is the demo's hand-off target into Beat 3.
 */
export interface StrategicOutcomeMetric {
  label: string;
  current: string;
  goal: string;
}

export interface StrategicOutcome {
  name: string;
  timeframe?: string;
  headline_metric: StrategicOutcomeMetric;
}

export interface ValueChainLever {
  action: string;
  /** Next-beat slug (e.g. "01-analyze") or null for non-clickable levers. */
  route: string | null;
  /** Exactly one phase per Beat 2 sets this to true. */
  is_priority?: boolean;
}

export interface ValueChainPhase {
  id: string;
  label: string;
  count?: string;
  value_attributed?: string;
  cycle_time?: string;
  /** Hex; matches the parent-object color from Beat 3 PE lane palette. */
  color: string;
  lever: ValueChainLever;
}

export interface ValueStreamMapSummary {
  end_to_end_cycle?: string;
  on_time_rate?: string;
}

/**
 * Optional narrative panel rendered below the phase strip. Anchors the
 * strategic_outcome to the customer's "why now" framing (patent cliff,
 * working-capital target, time-to-market window), and points the audience
 * at the priority lever before they click in. Keeps the L1 view from
 * reading as a bare KPI strip.
 */
export interface ValueStreamMapNarrative {
  heading?: string;
  body: string;
}

export interface ValueStreamMapSpec {
  kind: "value-stream-map";
  title: string;
  strategic_outcome: StrategicOutcome;
  phases: ValueChainPhase[];
  narrative?: ValueStreamMapNarrative;
  summary?: ValueStreamMapSummary;
}

// ---------- process-orchestration-flow (Beat 5 / 06-orchestration) ----------

export type OrchestrationActor =
  | "system"
  | "human"
  | "ai"
  | "agent"
  | "form"
  | "trigger";

export type OrchestrationStatus =
  | "complete"
  | "current"
  | "pending"
  | "skipped"
  | "failed";

/**
 * The OE step kind — drives the card's header band label. This is the
 * canonical OE Studio chrome:
 *   - `start`    → "Start process"  (always the first step; carries the
 *                                    trigger / Beat 4 action label)
 *   - `process`  → "Process step"   (runs an Action Flow — webform / agent
 *                                    / automation)
 *   - `resume`   → "Resume process" (picks up after a human submitted the
 *                                    webform from the prior process step)
 *   - `gateway`  → "Gateway"        (branch point — the flow splits into
 *                                    one or more conditional/parallel paths;
 *                                    see `subtype`). Mirrors the real OE
 *                                    Digital-Process gateway node.
 *   - `converge` → "Merge"          (branches rejoin into a single path).
 * `gateway`/`converge` are the OPT-IN branching variant — the canonical
 * demo flow stays a strict linear chain (start → process → resume →
 * process → process) and never carries a gateway.
 */
export type OrchestrationStepType =
  | "start"
  | "process"
  | "resume"
  | "gateway"
  | "converge";

/**
 * Gateway semantics — only meaningful when `step_type === "gateway"`.
 *   - `exclusive` (default) → exactly one outgoing branch is taken (XOR);
 *                             the untaken branches carry `status: skipped`.
 *   - `parallel`            → all outgoing branches run concurrently (AND).
 *   - `inclusive`           → one or more branches may be taken (OR).
 * Mirrors the real OE `DiagramElementSubTypes` (exclusive / parallel /
 * inclusive).
 */
export type GatewaySubtype = "exclusive" | "parallel" | "inclusive";

export interface OrchestrationStep {
  id: string;
  step_type: OrchestrationStepType;
  label: string;
  actor: OrchestrationActor;
  system?: string;
  status: OrchestrationStatus;
  duration?: string | null;
  narrative?: string;
  /** Only meaningful when `step_type === "gateway"`. Defaults to
   *  `"exclusive"` when unset. */
  subtype?: GatewaySubtype;
  /** Optional. When set on an `actor: agent` step, the card becomes
   *  clickable and opens this URL in a new tab — typically the per-customer
   *  Microsoft Copilot Studio app (the Vite app at localhost:5173 in dev,
   *  or its deployed URL). The webform popup for `actor: form` steps is
   *  derived from `label` + `narrative` and does not need a URL. */
  external_url?: string;
}

export interface OrchestrationConnection {
  from: string;
  to: string;
  /** Branch label rendered on the edge — e.g. "approved", "rejected",
   *  "Amount > $50k". Surfaces on gateway-out edges (the branching variant). */
  condition?: string;
  /** Marks the fallback / else branch out of a gateway — the path taken
   *  when no other branch condition matches. Rendered with a "default" chip. */
  is_default?: boolean;
}

export interface OrchestrationTrigger {
  case_id: string;
  source_screen: string;
  action_label: string;
  triggered_at?: string;
}

export interface OrchestrationSummary {
  total_steps?: number;
  completed?: number;
  eta?: string;
  value_recovered?: string;
}

export interface ProcessOrchestrationFlowSpec {
  kind: "process-orchestration-flow";
  title?: string;
  trigger: OrchestrationTrigger;
  steps: OrchestrationStep[];
  connections: OrchestrationConnection[];
  summary?: OrchestrationSummary;
}

// ---------- tab-group component ----------

/**
 * One tab's content — a mini board-column layout, same shape as `BoardView`'s
 * `columns[]`. Lets a tab be a single full-width component (e.g. a
 * process-explorer canvas) or a multi-column stack (e.g. a deviations table
 * beside an execution-log table + chart).
 */
export interface TabSpec {
  id: string;
  label: string;
  /** Optional badge count next to the label (e.g. open deviation count). */
  count?: number;
  columns: BoardColumn[];
}

/**
 * TabGroup — an internal tab strip inside a single board view/overlay, e.g.
 * a per-agent detail overlay's "Agent Mining" (process-explorer canvas) vs
 * "Details" (deviations + execution log + outlier trend) sub-views. Distinct
 * from routed screens: switching tabs never navigates, so it's the right
 * primitive for content that belongs to one drill-down but is too dense for
 * a single scroll.
 */
export interface TabGroupSpec {
  kind: "tab-group";
  tabs: TabSpec[];
  /** Tab `id` selected on mount. Defaults to the first tab. */
  default_tab?: string;
}

export interface CelonisStudioCopilotSpec {
  kind: "celonis-studio-copilot";
  /** Package/demo title shown in the breadcrumb bar */
  package_title: string;
  /** Space name shown in the breadcrumb */
  space_name?: string;
  /** Welcome heading — personalised to the presenter */
  greeting: string;
  /** Sub-line under the greeting */
  welcome_message?: string;
  /** Placeholder text for the chat input */
  input_placeholder?: string;
  /** Pre-populated conversation turns shown on load */
  conversation?: Array<{
    role: "user" | "agent";
    text: string;
  }>;
  /** Quick-action chips the user can click */
  quick_actions?: string[];
  /**
   * Scripted responses. First entry whose `match` array contains a keyword
   * found anywhere in the user message (case-insensitive) wins.
   * The last entry may omit `match` to act as a fallback.
   */
  responses?: Array<{
    match?: string[];
    text: string;
    /**
     * Optional scripted reasoning trace (markdown-lite). When set, the reply's
     * thought-step ("Loaded data" / "Displayed KPI/chart") becomes expandable
     * and reveals this text — mirrors the real Copilot's collapsible reasoning.
     */
    reasoning?: string;
    /**
     * Optional bare "big number" KPI block rendered ABOVE the text, introduced
     * by a "Displayed KPI" step — mirrors the real Copilot's metric answer
     * (e.g. label "Days Payable Outstanding", value "49.4 days").
     */
    kpi?: { label: string; value: string; caption?: string };
    /**
     * Optional chart rendered ABOVE the text, introduced by a "Displayed chart"
     * step. Reuses the shared board chart renderers/specs (chart-bar /
     * chart-line) so scripted copilot answers can show a bar or line chart.
     */
    chart?: ChartBarSpec | ChartLineSpec;
  }>;
}

// ---------- Discriminated unions ----------

export type ViewComponent =
  | BrandHeroSpec
  | KpiCardSpec
  | KpiListSpec
  | MiniChartSpec
  | TextBlockSpec
  | ChartBarSpec
  | ChartLineSpec
  | TableSpec
  | InsightCardListSpec
  | CtaRowSpec
  | StatCalloutSpec
  | ProcessExplorerSpec
  | ValueStreamMapSpec
  | ProcessOrchestrationFlowSpec
  | ContextModelSpec
  | CelonisStudioCopilotSpec
  | TabGroupSpec;

export type ComponentKind = ViewComponent["kind"];

/** A Screen Instance is currently always a board view. */
export type ScreenInstance = BoardView;
