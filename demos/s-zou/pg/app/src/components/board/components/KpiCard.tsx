/**
 * KpiCard — Control Tower's "primary KPI" cluster: 3 tiles (Current /
 * Industry Benchmark / Potential Value), each variant-styled. Status
 * (good/warning/bad) is derived from current-vs-benchmark using the
 * higher-is-better heuristic so authors don't have to state it explicitly.
 *
 * Lifted from the old `control-tower/ObjectiveColumn` so it can be composed
 * freely into any board view, not just the canonical 3-column Control Tower.
 */

import type { KpiCardSpec } from "@/types/screen-instance";
import { KpiTile, type KpiTileStatus } from "@/components/celonis/KpiTile";

export interface KpiCardProps {
  spec: KpiCardSpec;
}

function parseLeadingNumber(s: string): number | null {
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  if (/k/i.test(s)) return n * 1_000;
  if (/m/i.test(s)) return n * 1_000_000;
  if (/b/i.test(s)) return n * 1_000_000_000;
  return n;
}

function isHigherBetter(kpiName: string): boolean {
  const n = kpiName.toLowerCase();
  if (
    n.includes("delivery") ||
    n.includes("satisfaction") ||
    n.includes("capacity") ||
    n.includes("revenue") ||
    n.includes("conversion") ||
    n.includes("on-time") ||
    n.includes("availability") ||
    n.includes("first-time")
  )
    return true;
  if (
    n.includes("inventory") ||
    n.includes("outstanding") ||
    n.includes("dpo") ||
    n.includes("dio") ||
    n.includes("dso") ||
    n.includes("cost") ||
    n.includes("cycle time") ||
    n.includes("delay") ||
    n.includes("rework") ||
    n.includes("downtime") ||
    n.includes("churn") ||
    n.includes("leakage") ||
    n.includes("days")
  )
    return false;
  return true;
}

function statusVsBenchmark(
  kpiName: string,
  currentStr: string,
  benchmarkStr: string,
): KpiTileStatus {
  const cur = parseLeadingNumber(currentStr);
  const bench = parseLeadingNumber(benchmarkStr);
  if (cur == null || bench == null || bench === 0) return "neutral";
  const higherIsBetter = isHigherBetter(kpiName);
  const ratio = cur / bench;
  const better = higherIsBetter ? ratio >= 1 : ratio <= 1;
  if (better) return "good";
  const gap = higherIsBetter ? 1 - ratio : ratio - 1;
  if (gap <= 0.15) return "warning";
  return "bad";
}

export function KpiCard({ spec }: KpiCardProps) {
  const benchmark = spec.industry_benchmark;
  const potential = spec.potential_value;
  const status = benchmark
    ? statusVsBenchmark(spec.name, spec.value, benchmark)
    : "neutral";
  return (
    <div className="grid grid-cols-3 gap-3">
      <KpiTile variant="kpi-text" label={spec.name} value={spec.value} status={status} />
      {benchmark && (
        <KpiTile
          variant="kpi-text"
          label="Industry Benchmark"
          value={benchmark}
          status="neutral"
        />
      )}
      {potential && (
        <KpiTile variant="potential" label="Potential Value" value={potential} />
      )}
    </div>
  );
}
