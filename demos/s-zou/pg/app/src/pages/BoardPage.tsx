/**
 * BoardPage — single page wrapper for any board-kind view. Wraps `BoardView`
 * in `AppLayout` + `RouteContent`. Breadcrumbs come from the demo's explicit
 * `breadcrumbs` field when present, or are derived from
 * brand.name / framing / domain / title otherwise.
 */

import { useMemo, type CSSProperties } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BoardView } from "@/components/board/BoardView";
import { renderComponent } from "@/components/board/registry";
import { ComponentBoundary } from "@/components/board/ComponentBoundary";
import { OverlayPanel } from "@/components/board/OverlayPanel";
import { RouteContent } from "@/components/RouteContent";
import { PrepOverlay } from "@/components/prep/PrepOverlay";
import { OrchestrationActions } from "@/components/board/components/ProcessOrchestrationFlow";
import { useSearchParams } from "react-router-dom";
import { useDemoPathParams } from "@/lib/demo-paths";
import { useDemoRoutes } from "@/contexts/DemoDataContext";
import type { ScreenInstance, BoardColumn } from "@/types/screen-instance";

interface BoardPageProps {
  data: ScreenInstance;
}

const BREADCRUMB_TYPES = ["studio", "space", "package"] as const;

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

function underscoreToTitle(s: string): string {
  return s
    .split("_")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

function deriveBreadcrumbLabels(data: ScreenInstance): string[] {
  if (data.breadcrumbs && data.breadcrumbs.length > 0) {
    return data.breadcrumbs;
  }
  const studio = data.brand?.name ?? slugToTitle(data.id);
  const space = underscoreToTitle(data.framing);
  const pkg = data.domain.split(",")[0].trim();
  return [studio, space, pkg];
}

function allColumns(data: ScreenInstance): BoardColumn[] {
  if (data.view_kind !== "board") return [];
  const flat = data.columns ?? [];
  const grouped = (data.column_groups ?? []).flatMap((g) => g.columns);
  return [...flat, ...grouped];
}

function hasOrchestrationFlow(data: ScreenInstance): boolean {
  // Returns true when any column on this screen renders a
  // process-orchestration-flow component. Used to swap the page-header
  // right-side toolbar (Active toggle / Logs / edit) in for the default
  // 0%-presence + bell — only on the OE Studio screen, never elsewhere.
  for (const col of allColumns(data)) {
    for (const c of col.components ?? []) {
      if (c.kind === "process-orchestration-flow") return true;
    }
  }
  return false;
}

/**
 * Which screen's hotspots should render, given whether an overlay is open.
 * When an overlay IS open, hotspots must come ONLY from the overlay's own
 * screen (or none at all) — never fall back to the underlying screen's
 * hotspots. Those target elements the overlay panel now covers, so the glow
 * would render for a hidden target and, being a `document.body` portal at
 * the same z-[60] as the panel but mounted after it, paint on TOP of the
 * open overlay instead of being hidden behind it.
 */
export function resolveActiveHotspots(
  underlyingHotspots: ScreenInstance["hotspots"],
  overlayData: ScreenInstance | undefined,
): ScreenInstance["hotspots"] {
  return overlayData ? overlayData.hotspots : underlyingHotspots;
}

function hasContextModel(data: ScreenInstance): boolean {
  // Returns true when any column renders a context-model component. Context
  // Model is conceptually a top-level nav target (lives under "Context Models"
  // in the IconSidebar) rather than a per-package asset, so we hide the page
  // title + the package sidebar and collapse the breadcrumb to a single
  // "Context Model" entry on these pages.
  for (const col of allColumns(data)) {
    for (const c of col.components ?? []) {
      if (c.kind === "context-model") return true;
    }
  }
  return false;
}

export default function BoardPage({ data }: BoardPageProps) {
  const isContextModel = hasContextModel(data);

  // Context Model: collapse breadcrumb to a single "Context Model" entry —
  // it's a top-level nav target, not part of a package asset hierarchy.
  // Other screens: derive Studio / Space / Package / Title from the data.
  const breadcrumbs = isContextModel
    ? [{ label: "Context Model", type: "context-model" as const }]
    : (() => {
        const labels = deriveBreadcrumbLabels(data);
        return labels.map((label, i) => ({
          label,
          type: i < BREADCRUMB_TYPES.length ? BREADCRUMB_TYPES[i] : undefined,
          hasDropdown: i === labels.length - 1,
        }));
      })();

  const isOrchestration = hasOrchestrationFlow(data);

  // `?detail=<slug>` opens the named view as a slide-out overlay panel on
  // the right. The underlying BoardView stays mounted behind. Removing the
  // query param (X button or Esc) dismisses the panel without navigation.
  // Scope by owner+customer — otherwise the find collides across demos that
  // share an overlay slug (e.g. every demo has `05-operate-app-detail`)
  // and resolves to the alphabetically-first one.
  const demoRoutes = useDemoRoutes();
  const { owner, customer } = useDemoPathParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailSlug = searchParams.get("detail");
  const detailRoute =
    detailSlug && owner && customer
      ? demoRoutes.find(
          (r) =>
            r.owner === owner &&
            r.customer === customer &&
            r.component === detailSlug &&
            r.data.display_mode === "overlay",
        )
      : undefined;
  const closeOverlay = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("detail");
      return next;
    });
  };

  // `?embed=1` — chromeless view for iframing: no IconSidebar, no top menu /
  // breadcrumb bar, no package sidebar, no brand-hero, no hotspots. Just the
  // orchestration engine filling the frame. Renders the single canvas
  // component directly inside a flex-col viewport wrapper (bypassing AppLayout
  // AND BoardView) — the OE root is `flex flex-1 min-h-0`, so it needs a
  // flex-column parent with real height, which BoardView's full_canvas fast
  // path (a plain block div) does not provide.
  const isEmbed = searchParams.get("embed") === "1";
  const embedComponent = useMemo(() => {
    if (!isEmbed || data.view_kind !== "board") return null;
    const all = [
      ...(data.columns ?? []).flatMap((c) => c.components ?? []),
      ...(data.column_groups ?? []).flatMap((g) =>
        g.columns.flatMap((c) => c.components ?? []),
      ),
    ];
    return (
      all.find((c) => c.kind === "process-orchestration-flow") ??
      all.find((c) => c.kind !== "brand-hero") ??
      all[0] ??
      null
    );
  }, [data, isEmbed]);

  if (isEmbed) {
    const brandStyle = data.brand
      ? ({ "--brand-primary": data.brand.primary_color } as CSSProperties)
      : undefined;
    return (
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-white font-sans"
        style={brandStyle}
      >
        <ComponentBoundary
          label={`screen:${data.id}`}
          fallback={
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              This screen couldn’t be rendered.
            </div>
          }
        >
          {embedComponent ? (
            renderComponent(embedComponent, { brand: data.brand })
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No component to display.
            </div>
          )}
        </ComponentBoundary>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={breadcrumbs}
      title={data.full_canvas || isContextModel ? undefined : data.title}
      showTree={false}
      hideViewIndicators={isOrchestration}
      headerBordered={isOrchestration}
      activeNavItem={isContextModel ? "context-models" : "apps"}
      hidePackageSidebar={isContextModel}
      flushContent={isContextModel}
      actions={isOrchestration ? <OrchestrationActions /> : undefined}
    >
      <RouteContent>
        <ComponentBoundary
          label={`screen:${data.id}`}
          fallback={
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              This screen couldn’t be rendered.
            </div>
          }
        >
          <div className="relative h-full">
            <BoardView data={data} />
            {detailRoute && (
              <OverlayPanel
                key={detailRoute.component}
                data={detailRoute.data}
                onClose={closeOverlay}
              />
            )}
            <PrepOverlay
              hotspots={resolveActiveHotspots(data.hotspots, detailRoute?.data)}
            />
          </div>
        </ComponentBoundary>
      </RouteContent>
    </AppLayout>
  );
}
