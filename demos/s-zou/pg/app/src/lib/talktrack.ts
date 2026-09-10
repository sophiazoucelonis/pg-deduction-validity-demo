export interface TalktrackSection {
  heading: string;
  component: string | null;
  body: string;
}

export interface ParsedTalktrack {
  header: string;
  sections: TalktrackSection[];
}

// generate-talktrack.sh emits one section per screen as:
//   ## Beat: <component-slug>
// e.g. "## Beat: context-model", "## Beat: 01-analyze", "## Beat: 06-orchestration".
// We key sections by that slug — same value as the URL component segment — so
// the TalktrackPanel can pull the right section without a beat-number lookup
// table (which previously omitted context-model, 00-value-chain, and 06-orchestration).
const HEADING_RE = /^##\s+(.+)$/gm;
const COMPONENT_RE = /^Beat:\s+([\w-]+)\s*$/i;

function parse(raw: string): ParsedTalktrack {
  const firstHeading = raw.search(/^##\s+/m);
  const header = firstHeading === -1 ? raw : raw.slice(0, firstHeading);

  const sections: TalktrackSection[] = [];
  const matches = [...raw.matchAll(HEADING_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? raw.length : raw.length;
    const heading = m[1].trim();
    const body = raw.slice(start, end).trim();
    const componentMatch = heading.match(COMPONENT_RE);
    sections.push({
      heading,
      component: componentMatch ? componentMatch[1] : null,
      body,
    });
  }
  return { header, sections };
}

import { getBlobBaseUrl } from "@/lib/runtime-config";

const cache = new Map<string, ParsedTalktrack | null>();
const inflight = new Map<string, Promise<ParsedTalktrack | null>>();

function cacheKey(owner: string, customer: string): string {
  return `${owner}/${customer}`;
}

async function fetchAndParse(
  owner: string,
  customer: string,
): Promise<ParsedTalktrack | null> {
  try {
    const blobBase = getBlobBaseUrl();
    if (blobBase) {
      // Production: pull the markdown straight from blob.
      const url = `${blobBase.replace(/\/$/, "")}/${owner}/${customer}/demo-talktrack.meta.md`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const md = await res.text();
      if (!md) return null;
      return parse(md);
    }
    // Local dev: vite plugin endpoint.
    const res = await fetch(
      `/api/talktrack/${encodeURIComponent(owner)}/${encodeURIComponent(customer)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.markdown) return null;
    return parse(json.markdown);
  } catch {
    return null;
  }
}

export async function loadTalktrack(
  owner: string,
  customer: string,
): Promise<ParsedTalktrack | null> {
  const key = cacheKey(owner, customer);
  if (cache.has(key)) return cache.get(key)!;
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchAndParse(owner, customer).then((result) => {
      cache.set(key, result);
      inflight.delete(key);
      return result;
    });
    inflight.set(key, pending);
  }
  return pending;
}

export function getCachedTalktrack(
  owner: string,
  customer: string,
): ParsedTalktrack | null {
  return cache.get(cacheKey(owner, customer)) ?? null;
}

export function getActiveSection(
  parsed: ParsedTalktrack | null,
  component: string,
): {
  active: TalktrackSection | null;
  next: TalktrackSection | null;
} {
  if (!parsed) return { active: null, next: null };
  const idx = parsed.sections.findIndex((s) => s.component === component);
  if (idx === -1) return { active: null, next: null };
  return {
    active: parsed.sections[idx],
    next: parsed.sections[idx + 1] ?? null,
  };
}
