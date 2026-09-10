/**
 * ChartLine — explicit-data time-series line chart with one or more series.
 * Distinct from `mini-chart` (which generates a synthetic trendline from a
 * single current/median/world_class triple): authors supply real per-point
 * rows here, plus a series spec that maps each line to a row key.
 *
 * Self-wrapping — owns its card border + title.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ChartLineSpec } from "@/types/screen-instance";

export interface ChartLineProps {
  spec: ChartLineSpec;
}

const DEFAULT_COLORS = ["#264aff", "#7c93ff", "#26815a", "#dc2626"];

export function ChartLine({ spec }: ChartLineProps) {
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
        {/* `minHeight` here (not just on the wrapper div above) — see
         *  ChartBar.tsx's identical fix for why ResponsiveContainer needs
         *  its own explicit floor, not just a CSS min-height on an ancestor. */}
        <ResponsiveContainer minHeight={256}>
          <LineChart
            data={spec.rows}
            margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis
              dataKey={spec.x_axis.key}
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              label={
                spec.x_axis.label
                  ? {
                      value: spec.x_axis.label,
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 11,
                      fill: "#64748b",
                    }
                  : undefined
              }
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}${spec.unit_suffix ?? ""}`}
            />
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
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            {spec.series.map((s, i) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                type="monotone"
                stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
