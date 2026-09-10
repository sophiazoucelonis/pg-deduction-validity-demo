import { useParams } from "react-router-dom";

export interface DemoPathParams {
  owner: string | undefined;
  customer: string | undefined;
  component: string | undefined;
}

export function useDemoPathParams(): DemoPathParams {
  const params = useParams<{
    owner: string;
    customer: string;
    component: string;
  }>();
  return {
    owner: params.owner,
    customer: params.customer,
    component: params.component,
  };
}

// Base path for the current demo, e.g. "/e-doehler/siemens-energy".
// Returns empty string if owner/customer aren't in the route — callers should
// guard before navigating.
export function useDemoBasePath(): string {
  const { owner, customer } = useDemoPathParams();
  if (!owner || !customer) return "";
  return `/${owner}/${customer}`;
}

export function buildDemoPath(
  owner: string,
  customer: string,
  component: string,
): string {
  return `/${owner}/${customer}/${component}`;
}

// `external_url` started as "open this in a new tab" — used in CtaRow + the
// orchestration agent step. For the in-app Copilot Studio screen we want
// same-app navigation instead, working both in local dev (port 8080) and on
// the SWA. To keep YAMLs host-agnostic we treat anything that resolves to a
// same-origin path as in-app, and only window.open() truly external URLs.
//
// Returns:
//   - {kind: "in-app", path}  for "/copilot/x/y", "/foo/bar/baz", or any
//                             "http://localhost*" / same-origin URL
//   - {kind: "external", url} for everything else (https://example.com, etc.)
//   - {kind: "none"}          for empty/unset URLs
//
// Owner+customer are taken from the current route so legacy demos that
// embedded the wrong customer slug get rewritten on the way out.
export type ResolvedExternalUrl =
  | { kind: "in-app"; path: string }
  | { kind: "external"; url: string }
  | { kind: "none" };

export function resolveExternalUrl(
  rawUrl: string | undefined | null,
  current: { owner?: string; customer?: string },
): ResolvedExternalUrl {
  if (!rawUrl) return { kind: "none" };
  const url = rawUrl.trim();
  if (!url) return { kind: "none" };

  // Already a same-origin path.
  if (url.startsWith("/")) {
    return { kind: "in-app", path: rewriteCopilotPath(url, current) };
  }

  // localhost URLs from older YAMLs — treat as in-app, rewriting the
  // owner/customer segment to whatever's currently in the route.
  if (/^https?:\/\/localhost(?::\d+)?\//.test(url)) {
    try {
      const parsed = new URL(url);
      return {
        kind: "in-app",
        path: rewriteCopilotPath(parsed.pathname, current),
      };
    } catch {
      // fall through to external
    }
  }

  // Same-origin absolute URL (already on the running host) — treat as in-app.
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(url);
      if (parsed.origin === window.location.origin) {
        return {
          kind: "in-app",
          path: rewriteCopilotPath(parsed.pathname, current),
        };
      }
    } catch {
      // not a parseable URL — fall through
    }
  }

  return { kind: "external", url };
}

// Older YAMLs encoded `/copilot/<old-customer>` (2-segment, before owner
// namespacing). The new in-app route is `/copilot/<owner>/<customer>`. If we
// see the legacy 2-segment shape, splice in the current owner.
function rewriteCopilotPath(
  path: string,
  current: { owner?: string; customer?: string },
): string {
  const m = path.match(/^\/copilot\/([^/]+)(?:\/([^/]+))?(\/.*)?$/);
  if (!m) return path;
  const [, segA, segB, rest = ""] = m;
  if (segB) {
    // Already 3-segment — assume it's already correct.
    return path;
  }
  // Legacy 2-segment: rewrite to current owner + the customer slug from path.
  if (current.owner) return `/copilot/${current.owner}/${segA}${rest}`;
  return path;
}
