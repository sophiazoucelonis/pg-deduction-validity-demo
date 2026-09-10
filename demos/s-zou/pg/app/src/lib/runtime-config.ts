// Runtime data-source config — replaces the old build-time
// `import.meta.env.VITE_BLOB_BASE_URL`. The SAME app bundle is used both
// locally (served by the standalone launcher / Vite dev) and on the Azure SWA;
// it decides at startup where to read demo data from. main.tsx gates the first
// render on loadRuntimeConfig(), so getRuntimeConfig() is always populated by
// the time any component renders.
//
// IMPORTANT: never call these at module top-level (e.g. `const x = isBlobMode()`)
// — module evaluation happens at import, before loadRuntimeConfig() resolves,
// and getRuntimeConfig() would throw. Read them inside functions/effects only.

export type RuntimeMode = "local" | "blob";

export interface RuntimeConfig {
  mode: RuntimeMode;
  blobBaseUrl?: string;
}

// Non-secret, anonymous-read container. Must match deploy/config.blob.json.
export const DEFAULT_BLOB_BASE_URL =
  "https://atlasdemosdata.blob.core.windows.net/demos";

let _config: RuntimeConfig | null = null;

function hostnameFallback(): RuntimeConfig {
  const h = typeof location !== "undefined" ? location.hostname : "";
  const isLocal =
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]" ||
    h.endsWith(".local");
  return isLocal
    ? { mode: "local" }
    : { mode: "blob", blobBaseUrl: DEFAULT_BLOB_BASE_URL };
}

function normalize(raw: unknown): RuntimeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const mode = (raw as { mode?: unknown }).mode;
  if (mode === "local") return { mode: "local" };
  if (mode === "blob") {
    const url = (raw as { blobBaseUrl?: unknown }).blobBaseUrl;
    return {
      mode: "blob",
      blobBaseUrl: typeof url === "string" && url ? url : DEFAULT_BLOB_BASE_URL,
    };
  }
  return null;
}

// Fetch /config.json; on absent/malformed, fall back by hostname. Never rejects
// (so render is never blocked by a config error).
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: "no-store" });
    if (res.ok) {
      _config = normalize(await res.json()) ?? hostnameFallback();
      return _config;
    }
  } catch {
    /* fall through to hostname fallback */
  }
  _config = hostnameFallback();
  return _config;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!_config) {
    throw new Error(
      "Runtime config read before loadRuntimeConfig() resolved — do not read mode at module top-level.",
    );
  }
  return _config;
}

export function isBlobMode(): boolean {
  return getRuntimeConfig().mode === "blob";
}

export function getBlobBaseUrl(): string | undefined {
  const c = getRuntimeConfig();
  return c.mode === "blob" ? c.blobBaseUrl : undefined;
}
