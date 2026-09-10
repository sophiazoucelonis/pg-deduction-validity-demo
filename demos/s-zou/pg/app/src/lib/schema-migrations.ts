/**
 * Migrate-on-read — the demo-prototype's backward-compat mechanism.
 *
 * Demos are shared as YAML (in blob, or locally). When the app's YAML contract
 * changes in a BREAKING way (renaming/restructuring a required field, renaming
 * a `kind`, removing a component type), already-shared demos would otherwise
 * render wrong. Instead of pinning each demo to a versioned app bundle, the app
 * upgrades old YAML shapes IN MEMORY at load time, here.
 *
 * Contract:
 *  - `demo-yaml` stamps `schema_version: <CURRENT_SCHEMA_VERSION>` into every
 *    generated `*.screen.yaml`. Keep its generator in lockstep with the
 *    constant below.
 *  - Demos generated before versioning carry no stamp → treated as version 1.
 *  - ADDITIVE changes (new optional field, new `kind`, new screen, restyle)
 *    need NO migration and NO version bump.
 *  - A BREAKING change is the only reason to bump `CURRENT_SCHEMA_VERSION` and
 *    add a migration (the `demo-app-release` gate enforces this pairing).
 *
 * See the approved Phase 3 plan, Workstream C.
 */

import type { ScreenInstance } from "@/types/screen-instance";

/**
 * Current screen-YAML schema version. Bump ONLY on a breaking contract change,
 * and add a matching entry to `MIGRATIONS`.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * A single forward migration: takes a screen object at version `from` and
 * returns it at version `from + 1`. MUST be pure — no I/O, and clone anything
 * you restructure rather than relying on caller-side copies. Ship each one with
 * an old→new fixture test.
 */
export interface SchemaMigration {
  from: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Ordered forward migrations, one per version step. Empty until the first
 * breaking change ships. Example of a future v1→v2 entry (renamed
 * `strategic_outcome.headline_metric` → `.metrics`):
 *
 *   {
 *     from: 1,
 *     migrate: (d) => {
 *       const so = d.strategic_outcome as Record<string, unknown> | undefined;
 *       if (so && so.headline_metric && !so.metrics) {
 *         so.metrics = so.headline_metric;
 *         delete so.headline_metric;
 *       }
 *       return d;
 *     },
 *   },
 */
export const MIGRATIONS: SchemaMigration[] = [];

/**
 * Upgrade a parsed screen object to `CURRENT_SCHEMA_VERSION`. Reads
 * `schema_version` (absent ⇒ 1), then walks forward one version at a time,
 * applying the matching migration. If a step is missing (no path forward) it
 * stops and leaves the object partially migrated — any resulting render failure
 * is caught by `ComponentBoundary`, not a white screen. An object already at or
 * beyond the current version is passed through untouched.
 *
 * Pure and synchronous; never throws on a well-formed object.
 */
export function migrateScreen(data: ScreenInstance): ScreenInstance {
  if (!data || typeof data !== "object") return data;
  const obj = data as unknown as Record<string, unknown>;
  let version = typeof obj.schema_version === "number" ? obj.schema_version : 1;
  let current = obj;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) break; // no migration for this step — let the boundary surface any failure
    current = step.migrate(current);
    version += 1;
  }
  current.schema_version = version;
  return current as unknown as ScreenInstance;
}
