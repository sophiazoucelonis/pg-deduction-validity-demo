/**
 * ChartBar — bar chart with one or more named series. Supports vertical
 * (default) and horizontal orientation, grouped (default) and stacked.
 *
 * Data shape: a flat list of rows, one per category. Each row has a
 * `category` field (matching the spec's `categories[]` entries) plus one
 * numeric field per series (keyed by `series[].key`).
 *
 * Series colors default to a Celonis-blue ramp; authors can override per
 * series with `color`. Self-wrapping — owns its card border + title.
 *
 * `sequential: true` (single-series only) switches from one flat fill to a
 * magnitude ramp — each bar shaded by its value rank, darkest brand blue at
 * the highest value fading to a light tint at the lowest. Matches the real
 * Celonis "sorted magnitude" bar chart (e.g. an already-sorted error-count
 * chart) rather than treating unrelated categories as chart "series".
 */

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ChartBarSpec } from "@/types/screen-instance";

export interface ChartBarProps {
  spec: ChartBarSpec;
}

const DEFAULT_COLORS = ["#264aff", "#7c93ff", "#b3c0ff", "#1f3acc"];

// Sequential ramp endpoints — darkest and lightest steps of the app's own
// brand blue (not a separate palette), interpolated per-bar by value rank.
const SEQUENTIAL_DARK = [31, 26, 173]; // #1f1aad
const SEQUENTIAL_LIGHT = [190, 202, 253]; // #becafd

function lerpColor(a: number[], b: number[], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Coerce a row value to a number, tolerating comma thousands-separators
 *  (e.g. "1,284") so a hand-authored or LLM-generated string value doesn't
 *  silently become 0 and misrank its bar. Exported for direct unit testing —
 *  rendering ChartBar in jsdom requires a ResizeObserver polyfill recharts'
 *  ResponsiveContainer doesn't get in this repo's test setup. */
export function toNumericValue(v: string | number): number {
  if (typeof v === "number") return v;
  const n = Number(v.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/** Rank each row's single-series value (highest -> darkest) and return a
 *  fill per row index. Ties share the same shade at their shared rank. */
export function sequentialFills(values: number[]): string[] {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  const n = sorted.length;
  return values.map((v) => {
    const rank = sorted.indexOf(v);
    const t = n <= 1 ? 0 : rank / (n - 1);
    return lerpColor(SEQUENTIAL_DARK, SEQUENTIAL_LIGHT, t);
  });
}

export function ChartBar({ spec }: ChartBarProps) {
  const horizontal = spec.orientation === "horizontal";
  const stacked = spec.stacked === true;
  const sequential = spec.sequential === true && spec.series.length === 1 && !stacked;
  const sequentialValues = sequential
    ? spec.rows.map((r) => toNumericValue(r[spec.series[0].key] ?? 0))
    : null;
  const sequentialFillList = sequentialValues ? sequentialFills(sequentialValues) : null;

  return (
    <div className="flex flex-col flex-1 min-h-[16rem] rounded-xl border border-[#d3d3dd] bg-card overflow-hidden">
      {(spec.title || spec.description) && (
        <div className="px-5 pt-4 pb-2 flex flex-col gap-1">
          {spec.title && (
            <h4 className="text-base font-semibold text-foreground tracking-tight">
              {spec.title}
            </h4>
          )}
          {spec.description && (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {spec.description}
            </p>
          )}
        </div>
      )}
      <div className="flex-1 min-h-[16rem] w-full px-3 pb-3 pt-1">
        {/* `minHeight` here (not just on the wrapper div above) — Recharts'
         *  own resize observer needs an explicit floor. Relying solely on
         *  the wrapper's CSS min-height leaves ResponsiveContainer measuring
         *  0 whenever its ancestor's height is resolved via min-height
         *  clamping rather than actual flex-grow distribution (e.g. a
         *  TabGroup Details-tab column with no surplus space to grow into) —
         *  it never recovers even after the wrapper visibly has a nonzero
         *  height. Reproduced directly: 0 bars painted, wrapper at 256px. */}
        <ResponsiveContainer minHeight={256}>
          <BarChart
            data={spec.rows}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={!horizontal} horizontal={horizontal} />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${spec.unit_prefix ?? ""}${v}${spec.unit_suffix ?? ""}`}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  width={90}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${spec.unit_prefix ?? ""}${v}${spec.unit_suffix ?? ""}`}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                borderColor: "#d3d3dd",
              }}
              formatter={(value: number | string) =>
                `${value}${spec.unit_suffix ?? ""}`
              }
            />
            {!sequential && <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />}
            {spec.series.map((s, i) => {
              // Canonical Celonis stacked-bar behavior: only the topmost
              // (last) series rounds the outer end of the stack; all lower
              // segments are square so the stack reads as a single unified
              // column. For non-stacked (grouped) bars, every bar gets its
              // own rounded outer end as before.
              const isLastSeries = i === spec.series.length - 1;
              const roundedEnd: [number, number, number, number] = horizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0];
              const flatEnd: [number, number, number, number] = [0, 0, 0, 0];
              const radius = stacked
                ? isLastSeries
                  ? roundedEnd
                  : flatEnd
                : roundedEnd;
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  stackId={stacked ? "stack" : undefined}
                  radius={radius}
                >
                  {sequential &&
                    sequentialFillList!.map((fill, idx) => (
                      <Cell key={idx} fill={fill} />
                    ))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {sequential && sequentialValues!.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-5 pb-3 text-[11px] text-muted-foreground">
          <span>{spec.series[0].label}:</span>
          <span>
            {spec.unit_prefix ?? ""}
            {Math.min(...sequentialValues!)}
            {spec.unit_suffix ?? ""}
          </span>
          <div
            className="h-2 w-24 rounded-full"
            style={{
              background: `linear-gradient(to right, rgb(${SEQUENTIAL_LIGHT.join(",")}), rgb(${SEQUENTIAL_DARK.join(",")}))`,
            }}
          />
          <span>
            {spec.unit_prefix ?? ""}
            {Math.max(...sequentialValues!)}
            {spec.unit_suffix ?? ""}
          </span>
        </div>
      )}
    </div>
  );
}
