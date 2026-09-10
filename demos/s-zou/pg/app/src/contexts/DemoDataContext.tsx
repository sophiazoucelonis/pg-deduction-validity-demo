import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { parse as parseYaml } from "yaml";
import { isBlobMode, getBlobBaseUrl } from "@/lib/runtime-config";
import { migrateScreen } from "@/lib/schema-migrations";
import type { ScreenInstance } from "@/types/screen-instance";
import type { CopilotStudioData } from "@/types/copilot-studio";

export interface DemoSource {
  name: string;
  path: string;
}

export interface DemoRoute {
  owner: string;
  customer: string;
  component: string;
  source: string;
  data: ScreenInstance;
}

export interface PackageView {
  component: string;
  label: string;
  iconClass: string;
  isOrchestration: boolean;
}

export interface CopilotRoute {
  owner: string;
  customer: string;
  source: string;
  data: CopilotStudioData | Record<string, unknown>;
}

interface DemoDataContextValue {
  sources: DemoSource[];
  demoRoutes: DemoRoute[];
  copilotRoutes: CopilotRoute[];
  loading: boolean;
  refresh: () => void;
}

const DemoDataContext = createContext<DemoDataContextValue>({
  sources: [],
  demoRoutes: [],
  copilotRoutes: [],
  loading: true,
  refresh: () => {},
});

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function screenHasOrchestrationFlow(data: ScreenInstance): boolean {
  for (const col of data.columns ?? []) {
    for (const c of col.components ?? []) {
      if ((c as { kind?: string }).kind === "process-orchestration-flow") return true;
    }
  }
  return false;
}

export function packageViewsFor(
  routes: DemoRoute[],
  owner: string,
  customer: string,
): PackageView[] {
  return routes
    .filter(
      (r) =>
        r.owner === owner &&
        r.customer === customer &&
        r.data.display_mode !== "overlay" &&
        r.component !== "context-model",
    )
    .map((r) => ({
      component: r.component,
      label: r.data.title ?? slugToTitle(r.component),
      iconClass: "ce-font-icon-board-general",
      isOrchestration: screenHasOrchestrationFlow(r.data),
    }));
}

interface FetchResult {
  sources: DemoSource[];
  routes: DemoRoute[];
  copilots: CopilotRoute[];
}

interface ApiRoute {
  owner: string;
  customer: string;
  component: string;
  source: string;
  data: Record<string, unknown>;
}

interface ApiCopilot {
  owner: string;
  customer: string;
  source: string;
  data: Record<string, unknown>;
}

async function fetchAllDemosLocal(): Promise<FetchResult> {
  const res = await fetch("/api/demos");
  if (!res.ok) return { sources: [], routes: [], copilots: [] };
  const json = await res.json();
  const sources: DemoSource[] = json.sources ?? [];
  const routes = (json.routes ?? []).map((r: ApiRoute) => ({
    owner: r.owner,
    customer: r.customer,
    component: r.component,
    source: r.source ?? "",
    data: migrateScreen(r.data as unknown as ScreenInstance),
  }));
  const copilots = (json.copilots ?? []).map((c: ApiCopilot) => ({
    owner: c.owner,
    customer: c.customer,
    source: c.source ?? "",
    data: c.data,
  }));
  return { sources, routes, copilots };
}

interface BlobManifest {
  screens?: string[];
}

function inferComponentName(filename: string): string {
  if (filename.endsWith(".screen.yaml")) return filename.replace(/\.screen\.yaml$/, "");
  if (filename.endsWith(".copilot.yaml")) return filename.replace(/\.copilot\.yaml$/, "");
  return filename.replace(/\.(yaml|yml)$/, "");
}

async function fetchYamlFromBlob(url: string): Promise<Record<string, unknown> | null> {
  try {
    // no-store: GitHub Pages serves these YAMLs with cache-control max-age=600,
    // which left the embedded iframe showing a stale screen for up to 10 min
    // after a deploy. Always fetch the freshest copy.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const data = parseYaml(text);
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Production-only: load a single (owner, customer) demo from blob.
// Manifest lists screen names (without extension); each screen YAML is fetched
// in parallel. Copilot config lives at copilot-studio.copilot.yaml.
async function fetchDemoFromBlob(owner: string, customer: string): Promise<FetchResult> {
  const blobBase = getBlobBaseUrl();
  if (!blobBase) return { sources: [], routes: [], copilots: [] };
  const base = `${blobBase.replace(/\/$/, "")}/${owner}/${customer}`;

  const manifestRes = await fetch(`${base}/manifest.yaml`, { cache: "no-store" });
  if (!manifestRes.ok) return { sources: [], routes: [], copilots: [] };
  const manifestText = await manifestRes.text();
  const manifest = (parseYaml(manifestText) as BlobManifest) ?? {};
  const screens = Array.isArray(manifest.screens) ? manifest.screens : [];

  // Fan out fetches in parallel, but collect results positionally so the
  // final routes/copilots arrays follow the manifest's order verbatim.
  // Pushing inline inside Promise.all() leaks completion-order into UI order,
  // which is what causes the sidebar to reshuffle between page loads.
  type FetchedEntry =
    | { kind: "route"; component: string; data: ScreenInstance }
    | { kind: "copilot"; data: CopilotStudioData }
    | null;

  const results: FetchedEntry[] = await Promise.all(
    screens.map(async (entry): Promise<FetchedEntry> => {
      // Each manifest entry is a filename relative to the demo dir, with the
      // .yaml extension stripped (e.g. "context-model", "copilot-studio.copilot").
      // Try .screen.yaml first, then .copilot.yaml, then plain .yaml.
      const candidates = [
        `${entry}.screen.yaml`,
        `${entry}.copilot.yaml`,
        `${entry}.yaml`,
      ];

      for (const filename of candidates) {
        const data = await fetchYamlFromBlob(`${base}/${filename}`);
        if (!data) continue;
        if (filename.endsWith(".copilot.yaml")) {
          return { kind: "copilot", data: data as unknown as CopilotStudioData };
        }
        return {
          kind: "route",
          component: inferComponentName(filename),
          data: migrateScreen(data as unknown as ScreenInstance),
        };
      }
      return null;
    }),
  );

  const routes: DemoRoute[] = [];
  const copilots: CopilotRoute[] = [];
  for (const r of results) {
    if (!r) continue;
    if (r.kind === "copilot") {
      copilots.push({ owner, customer, source: "blob", data: r.data });
    } else {
      routes.push({
        owner,
        customer,
        component: r.component,
        source: "blob",
        data: r.data,
      });
    }
  }

  return {
    sources: [{ name: "blob", path: base }],
    routes,
    copilots,
  };
}

function parseOwnerCustomerFromPath(pathname: string): { owner: string; customer: string } | null {
  // /:owner/:customer/:component for screens, /copilot/:owner/:customer for the agent.
  // Strip the literal "copilot" prefix so the copilot route loads the same blob as its screens.
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "copilot") parts.shift();
  if (parts.length < 2) return null;
  return { owner: parts[0], customer: parts[1] };
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sources, setSources] = useState<DemoSource[]>([]);
  const [demoRoutes, setDemoRoutes] = useState<DemoRoute[]>([]);
  const [copilotRoutes, setCopilotRoutes] = useState<CopilotRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedKeys = useRef(new Set<string>()); // owner/customer cache for blob mode

  const loadLocal = () => {
    fetchAllDemosLocal().then(({ sources: s, routes, copilots }) => {
      setSources(s);
      setDemoRoutes(routes);
      setCopilotRoutes(copilots);
      setLoading(false);
    });
  };

  const loadBlobForRoute = async (owner: string, customer: string) => {
    const key = `${owner}/${customer}`;
    if (loadedKeys.current.has(key)) {
      setLoading(false);
      return;
    }
    loadedKeys.current.add(key);
    setLoading(true);
    const { sources: s, routes, copilots } = await fetchDemoFromBlob(owner, customer);
    setSources((prev) => mergeUnique(prev, s, (x) => x.name));
    setDemoRoutes((prev) => [
      ...prev.filter((r) => !(r.owner === owner && r.customer === customer)),
      ...routes,
    ]);
    setCopilotRoutes((prev) => [
      ...prev.filter((c) => !(c.owner === owner && c.customer === customer)),
      ...copilots,
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isBlobMode()) {
      loadLocal();
      return;
    }
    const ids = parseOwnerCustomerFromPath(location.pathname);
    if (ids) loadBlobForRoute(ids.owner, ids.customer);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const value = useMemo(
    () => ({
      sources,
      demoRoutes,
      copilotRoutes,
      loading,
      refresh: isBlobMode()
        ? () => {
            loadedKeys.current.clear();
            const ids = parseOwnerCustomerFromPath(location.pathname);
            if (ids) loadBlobForRoute(ids.owner, ids.customer);
          }
        : loadLocal,
    }),
    [sources, demoRoutes, copilotRoutes, loading, location.pathname],
  );

  return (
    <DemoDataContext.Provider value={value}>
      {children}
    </DemoDataContext.Provider>
  );
}

function mergeUnique<T>(prev: T[], next: T[], key: (item: T) => string): T[] {
  const seen = new Set(prev.map(key));
  const result = [...prev];
  for (const item of next) {
    if (!seen.has(key(item))) {
      seen.add(key(item));
      result.push(item);
    }
  }
  return result;
}

export function useDemoData() {
  return useContext(DemoDataContext);
}

export function useDemoSources() {
  return useContext(DemoDataContext).sources;
}

export function useDemoRoutes() {
  return useContext(DemoDataContext).demoRoutes;
}

export function useCopilotData(
  owner: string | undefined,
  customer: string | undefined,
): CopilotStudioData | null {
  const { copilotRoutes } = useContext(DemoDataContext);
  return useMemo(() => {
    if (!owner || !customer) return null;
    const entry = copilotRoutes.find(
      (c) => c.owner === owner && c.customer === customer,
    );
    if (!entry || !entry.data || Object.keys(entry.data).length === 0)
      return null;
    return entry.data as CopilotStudioData;
  }, [copilotRoutes, owner, customer]);
}

export function usePackageViews(
  owner: string | undefined,
  customer: string | undefined,
): PackageView[] {
  const { demoRoutes } = useContext(DemoDataContext);
  return useMemo(
    () => (owner && customer ? packageViewsFor(demoRoutes, owner, customer) : []),
    [demoRoutes, owner, customer],
  );
}

// A function, NOT a module-level const: a top-level `const = isBlobMode()` would
// evaluate at import time, before loadRuntimeConfig() resolves, and throw.
export function isProductionBlobMode(): boolean {
  return isBlobMode();
}
