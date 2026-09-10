import { describe, it, expect } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrateScreen,
  type SchemaMigration,
} from "./schema-migrations";
import type { ScreenInstance } from "@/types/screen-instance";

/**
 * These tests pin the migrate-on-read CONTRACT, independent of how many
 * migrations exist. They use a local, isolated migration list to prove the
 * walk-forward behavior so they keep passing as real migrations are added.
 */

function runMigrations(
  data: Record<string, unknown>,
  migrations: SchemaMigration[],
  target: number,
): Record<string, unknown> {
  // Mirror of migrateScreen's loop, parameterized for test isolation.
  let version = typeof data.schema_version === "number" ? data.schema_version : 1;
  let current = data;
  while (version < target) {
    const step = migrations.find((m) => m.from === version);
    if (!step) break;
    current = step.migrate(current);
    version += 1;
  }
  current.schema_version = version;
  return current;
}

describe("migrateScreen (production list)", () => {
  it("treats an unstamped legacy demo as v1 and stamps it to current", () => {
    const legacy = { id: "x", columns: [] } as unknown as ScreenInstance;
    const out = migrateScreen(legacy) as unknown as Record<string, unknown>;
    expect(out.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("passes a current-version demo through untouched", () => {
    const cur = {
      id: "x",
      columns: [],
      schema_version: CURRENT_SCHEMA_VERSION,
    } as unknown as ScreenInstance;
    const out = migrateScreen(cur) as unknown as Record<string, unknown>;
    expect(out.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("leaves a future-version demo's version intact (no downgrade)", () => {
    const future = {
      id: "x",
      columns: [],
      schema_version: CURRENT_SCHEMA_VERSION + 5,
    } as unknown as ScreenInstance;
    const out = migrateScreen(future) as unknown as Record<string, unknown>;
    expect(out.schema_version).toBe(CURRENT_SCHEMA_VERSION + 5);
  });

  it("does not throw on a non-object", () => {
    expect(() => migrateScreen(null as unknown as ScreenInstance)).not.toThrow();
  });

  it("keeps the production migration list contiguous and sorted", () => {
    // Each migration must bump exactly one version, with no gaps, so the
    // walk-forward loop can always find the next step.
    MIGRATIONS.forEach((m, i) => {
      expect(m.from).toBe(i + 1);
    });
    expect(MIGRATIONS.length).toBe(CURRENT_SCHEMA_VERSION - 1);
  });
});

describe("walk-forward behavior (isolated example list)", () => {
  // A throwaway v1→v2 migration: rename `headline_metric` → `metrics`.
  const example: SchemaMigration[] = [
    {
      from: 1,
      migrate: (d) => {
        const so = d.strategic_outcome as Record<string, unknown> | undefined;
        if (so && so.headline_metric && !so.metrics) {
          so.metrics = so.headline_metric;
          delete so.headline_metric;
        }
        return d;
      },
    },
  ];

  it("upgrades an unstamped (v1) shape to v2", () => {
    const old = {
      strategic_outcome: { headline_metric: { current: "1", goal: "2" } },
    };
    const out = runMigrations(old, example, 2);
    expect(out.schema_version).toBe(2);
    expect((out.strategic_outcome as Record<string, unknown>).metrics).toEqual({
      current: "1",
      goal: "2",
    });
    expect(
      (out.strategic_outcome as Record<string, unknown>).headline_metric,
    ).toBeUndefined();
  });

  it("passes an already-v2 shape through without re-running the rename", () => {
    const already = {
      schema_version: 2,
      strategic_outcome: { metrics: { current: "9", goal: "9" } },
    };
    const out = runMigrations(already, example, 2);
    expect(out.schema_version).toBe(2);
    expect((out.strategic_outcome as Record<string, unknown>).metrics).toEqual({
      current: "9",
      goal: "9",
    });
  });

  it("stops (and does not loop forever) when a step is missing", () => {
    const out = runMigrations({ schema_version: 1 }, [], 3);
    expect(out.schema_version).toBe(1);
  });
});
