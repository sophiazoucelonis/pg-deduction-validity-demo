// Demos-API core — the demo-discovery + registry logic shared by BOTH the Vite
// dev plugin (vite-plugin-demos-api.ts) and the standalone no-build launcher
// (server/standalone.ts). Vite-free and side-effect-free so esbuild can bundle
// it into a single self-contained file.
//
// The two filesystem paths that used to rely on `__dirname` (the base context
// model + the fixtures fallback) are PARAMETERIZED via DemosApiOptions, because
// `__dirname` is meaningless once this is bundled into a relocated server file.

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface DemoEntry {
  owner: string;
  customer: string;
  component: string;
  source: string;
  data: Record<string, unknown>;
}

export interface CopilotEntry {
  owner: string;
  customer: string;
  source: string;
  data: Record<string, unknown>;
}

export interface DemoSource {
  name: string;
  path: string;
}

export interface DemosApiResponse {
  sources: DemoSource[];
  routes: DemoEntry[];
  copilots: CopilotEntry[];
}

interface RegistryFile {
  sources?: { name?: string; path?: string }[];
}

export interface DemosApiOptions {
  projectDir?: string;
  userRegistryPath?: string;
  fallbackDir?: string;
  /** Path to src/data/base-context-model.yaml (caller resolves; no __dirname). */
  baseContextModelPath?: string;
  /** Fixtures fallback dir used only when no registry source resolves. */
  fixturesDir?: string;
}

const baseContextModelCache = new Map<string, Record<string, unknown> | null>();
function getBaseContextModel(opts: DemosApiOptions): Record<string, unknown> | null {
  const p = opts.baseContextModelPath;
  if (!p) return null;
  if (baseContextModelCache.has(p)) return baseContextModelCache.get(p)!;
  let data: Record<string, unknown> | null = null;
  try {
    data = parseYaml(fs.readFileSync(p, "utf-8"));
  } catch {
    data = null;
  }
  baseContextModelCache.set(p, data);
  return data;
}

function readRegistry(filePath: string, resolveBase: string): DemoSource[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = parseYaml(raw) as RegistryFile | null;
    if (!parsed?.sources || !Array.isArray(parsed.sources)) return [];
    return parsed.sources
      .filter((s): s is { name: string; path: string } =>
        typeof s?.name === "string" && typeof s?.path === "string",
      )
      .map((s) => ({ name: s.name, path: path.resolve(resolveBase, s.path) }));
  } catch {
    return [];
  }
}

export function resolveSources(opts: DemosApiOptions): DemoSource[] {
  const sources: DemoSource[] = [];
  const seen = new Set<string>();

  if (opts.projectDir) {
    const projectRegistry = path.join(opts.projectDir, ".atlas", "demos.yaml");
    for (const s of readRegistry(projectRegistry, opts.projectDir)) {
      if (!seen.has(s.path)) {
        seen.add(s.path);
        sources.push(s);
      }
    }
  }

  if (opts.userRegistryPath) {
    const homeDir = path.dirname(path.dirname(opts.userRegistryPath));
    for (const s of readRegistry(opts.userRegistryPath, homeDir)) {
      if (!seen.has(s.path)) {
        seen.add(s.path);
        sources.push(s);
      }
    }
  }

  if (opts.fallbackDir && sources.length === 0) {
    const resolved = path.resolve(opts.fallbackDir);
    if (!seen.has(resolved)) sources.push({ name: "Local demos", path: resolved });
  }

  if (sources.length === 0 && opts.fixturesDir) {
    const fixtures = path.resolve(opts.fixturesDir);
    if (fs.existsSync(fixtures) && !seen.has(fixtures)) {
      sources.push({ name: "Fixtures", path: fixtures });
    }
  }

  return sources;
}

export function buildResponse(opts: DemosApiOptions): DemosApiResponse {
  const sources = resolveSources(opts);
  const routes: DemoEntry[] = [];
  const copilots: CopilotEntry[] = [];
  const allDemos = new Set<string>(); // owner/customer

  for (const source of sources) {
    scanDemoDir(source.path, source.name, routes, copilots, allDemos);
  }

  const baseData = getBaseContextModel(opts);
  if (baseData) {
    const demosWithCM = new Set(
      routes
        .filter((r) => r.component === "context-model")
        .map((r) => `${r.owner}/${r.customer}`),
    );
    for (const key of allDemos) {
      if (!demosWithCM.has(key)) {
        const [owner, customer] = key.split("/");
        const source =
          routes.find((r) => r.owner === owner && r.customer === customer)?.source ?? "";
        routes.push({ owner, customer, component: "context-model", source, data: baseData });
      }
    }
  }

  routes.sort(
    (a, b) =>
      a.owner.localeCompare(b.owner) ||
      a.customer.localeCompare(b.customer) ||
      a.component.localeCompare(b.component),
  );

  return { sources, routes, copilots };
}

// Filesystem layout: <demosDir>/<owner>/<customer>/<screen>.yaml — each
// owner/customer pair is one independent demo (same path under Azure blob).
export function scanDemoDir(
  demosDir: string,
  sourceName: string,
  routes: DemoEntry[],
  copilots: CopilotEntry[],
  allDemos: Set<string>,
): void {
  if (!fs.existsSync(demosDir)) return;

  const owners = fs
    .readdirSync(demosDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  for (const owner of owners) {
    const ownerDir = path.join(demosDir, owner);
    const customers = fs
      .readdirSync(ownerDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const customer of customers) {
      allDemos.add(`${owner}/${customer}`);
      const customerDir = path.join(ownerDir, customer);
      const files = fs.readdirSync(customerDir);

      for (const file of files) {
        const filePath = path.join(customerDir, file);

        if (file.endsWith(".screen.yaml")) {
          try {
            const data = parseYaml(fs.readFileSync(filePath, "utf-8"));
            if (!data || typeof data !== "object") continue;
            routes.push({
              owner,
              customer,
              component: file.replace(/\.screen\.yaml$/, ""),
              source: sourceName,
              data,
            });
          } catch {
            /* skip malformed YAML */
          }
        } else if (
          (file.endsWith(".yaml") || file.endsWith(".yml")) &&
          !file.endsWith(".copilot.yaml") &&
          file !== "manifest.yaml"
        ) {
          try {
            const data = parseYaml(fs.readFileSync(filePath, "utf-8"));
            if (!data || typeof data !== "object") continue;
            routes.push({
              owner,
              customer,
              component: file.replace(/\.(yaml|yml)$/, ""),
              source: sourceName,
              data,
            });
          } catch {
            /* skip malformed YAML */
          }
        }

        if (file.endsWith(".copilot.yaml")) {
          try {
            const data = parseYaml(fs.readFileSync(filePath, "utf-8")) ?? {};
            copilots.push({ owner, customer, source: sourceName, data });
          } catch {
            copilots.push({ owner, customer, source: sourceName, data: {} });
          }
        } else if (file === "copilot-studio.ts") {
          copilots.push({ owner, customer, source: sourceName, data: {} });
        }
      }
    }
  }
}

export function findTalktrack(
  opts: DemosApiOptions,
  owner: string,
  customer: string,
): string | null {
  for (const source of resolveSources(opts)) {
    const candidates = [
      path.join(source.path, owner, customer, "demo-talktrack.meta.md"),
      path.join(source.path, owner, customer, "demo-talktrack.md"),
    ];
    for (const p of candidates) {
      try {
        return fs.readFileSync(p, "utf-8");
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

export function readJsonBody(
  req: import("http").IncomingMessage,
  cb: (err: Error | null, body: unknown) => void,
) {
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    try {
      cb(null, JSON.parse(Buffer.concat(chunks).toString()));
    } catch (e) {
      cb(e as Error, null);
    }
  });
}

export interface RegistrySourceEntry {
  registry: "project" | "user";
  name: string;
  path: string;
  resolvedPath: string;
}

function registryFilePath(
  opts: DemosApiOptions,
  registry: string,
): { filePath: string; resolveBase: string } | null {
  if (registry === "project" && opts.projectDir) {
    return {
      filePath: path.join(opts.projectDir, ".atlas", "demos.yaml"),
      resolveBase: opts.projectDir,
    };
  }
  if (registry === "user" && opts.userRegistryPath) {
    return {
      filePath: opts.userRegistryPath,
      resolveBase: path.dirname(path.dirname(opts.userRegistryPath)),
    };
  }
  return null;
}

function readRegistryRaw(filePath: string): { name: string; path: string }[] {
  try {
    const parsed = parseYaml(fs.readFileSync(filePath, "utf-8")) as RegistryFile | null;
    if (!parsed?.sources || !Array.isArray(parsed.sources)) return [];
    return parsed.sources.filter(
      (s): s is { name: string; path: string } =>
        typeof s?.name === "string" && typeof s?.path === "string",
    );
  } catch {
    return [];
  }
}

export function listRegistrySources(opts: DemosApiOptions): RegistrySourceEntry[] {
  const result: RegistrySourceEntry[] = [];

  if (opts.projectDir) {
    const filePath = path.join(opts.projectDir, ".atlas", "demos.yaml");
    for (const s of readRegistryRaw(filePath)) {
      result.push({
        registry: "project",
        name: s.name,
        path: s.path,
        resolvedPath: path.resolve(opts.projectDir, s.path),
      });
    }
  }

  if (opts.userRegistryPath) {
    const homeDir = path.dirname(path.dirname(opts.userRegistryPath));
    for (const s of readRegistryRaw(opts.userRegistryPath)) {
      result.push({
        registry: "user",
        name: s.name,
        path: s.path,
        resolvedPath: path.resolve(homeDir, s.path),
      });
    }
  }

  return result;
}

export function addRegistrySource(
  opts: DemosApiOptions,
  body: { registry: string; name: string; path: string },
) {
  if (!body.name || !body.path) throw new Error("name and path are required");
  const reg = registryFilePath(opts, body.registry);
  if (!reg) throw new Error(`Unknown registry: ${body.registry}`);

  let parsed: RegistryFile | null = null;
  try {
    parsed = parseYaml(fs.readFileSync(reg.filePath, "utf-8")) as RegistryFile | null;
  } catch {
    /* file doesn't exist yet */
  }

  if (!parsed || typeof parsed !== "object") parsed = {};
  if (!Array.isArray(parsed.sources)) parsed.sources = [];

  const existing = parsed.sources.find(
    (s) => s.name === body.name || s.path === body.path,
  );
  if (existing) throw new Error(`Source already exists: ${existing.name}`);

  parsed.sources.push({ name: body.name, path: body.path });

  const dir = path.dirname(reg.filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reg.filePath, stringifyYaml(parsed), "utf-8");
}

export function removeRegistrySource(
  opts: DemosApiOptions,
  body: { registry: string; name: string },
) {
  if (!body.name) throw new Error("name is required");
  const reg = registryFilePath(opts, body.registry);
  if (!reg) throw new Error(`Unknown registry: ${body.registry}`);

  let parsed: RegistryFile | null = null;
  try {
    parsed = parseYaml(fs.readFileSync(reg.filePath, "utf-8")) as RegistryFile | null;
  } catch {
    throw new Error("Registry file not found");
  }

  if (!parsed?.sources || !Array.isArray(parsed.sources)) {
    throw new Error("No sources in registry");
  }

  const idx = parsed.sources.findIndex((s) => s.name === body.name);
  if (idx === -1) throw new Error(`Source not found: ${body.name}`);

  parsed.sources.splice(idx, 1);
  fs.writeFileSync(reg.filePath, stringifyYaml(parsed), "utf-8");
}

export function pickDirectory(
  opts: DemosApiOptions,
): Promise<{ path: string; relativePath: string | null }> {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin") {
      reject(new Error("Directory picker only supported on macOS"));
      return;
    }
    const script =
      'POSIX path of (choose folder with prompt "Select demo source directory")';
    execFile("osascript", ["-e", script], (err, stdout) => {
      if (err) {
        reject(err.code === 1 ? new Error("cancelled") : err);
        return;
      }
      const abs = stdout.trim().replace(/\/$/, "");
      let relativePath: string | null = null;
      if (opts.projectDir && abs.startsWith(opts.projectDir + "/")) {
        relativePath = abs.slice(opts.projectDir.length + 1);
      }
      resolve({ path: abs, relativePath });
    });
  });
}
