/**
 * MiniChart — synthetic line chart matching the Celonis Control Tower look.
 *
 * Design choices (vs real product screenshot):
 *   - BOTH series rendered in brand blue (Current = solid, Median = lighter).
 *     Status color is encoded in the KpiTiles above the chart, not the chart.
 *   - World-class reference line: green dashed with right-side label.
 *   - No background gridlines — keeps the chart calm and product-like.
 *   - Small header above the chart: "↑ Current [KPI], Median".
 *   - Axes: minimal — Y-axis labels only, X-axis sparse date labels rotated.
 */

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface MiniChartProps {
  /** Brief descriptor (used as accessibility label). */
  description: string;
  /** Header label, e.g. "Current OTD, Median". Rendered above the chart. */
  headerLabel?: string;
  /** Trend hint: bias the synthetic series direction. */
  trend?: "up" | "down" | "flat";
  /** Numeric anchor for the Current series (last month). */
  currentValue?: number;
  /** Numeric anchor for the Median series (constant ~ benchmark). */
  medianValue?: number;
  /** Optional "world class" reference value drawn as a horizontal dashed line. */
  worldClassValue?: number;
  /** Y-axis unit suffix shown on tooltip + axis labels (e.g., " days"). */
  unitSuffix?: string;
}

function generateMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date(2024, 4, 1); // anchor: 2024-05
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function generateSeries(
  months: string[],
  trend: "up" | "down" | "flat",
  end: number
): Array<{ period: string; current: number; median: number }> {
  const drift = trend === "up" ? 1 : trend === "down" ? -1 : 0;
  const startVal = Math.max(1, end - drift * months.length);
  const noise = () => (Math.random() - 0.5) * Math.max(2, end * 0.04);
  return months.map((period, i) => ({
    period,
    current: Math.max(0, Math.round(startVal + ((end - startVal) * i) / (months.length - 1) + noise())),
    median: 0, // filled later if medianValue provided
  }));
}

const CURRENT_BLUE = "hsl(var(--accent))";
const MEDIAN_BLUE = "hsl(var(--accent) / 0.45)";
const REFERENCE_GREEN = "hsl(var(--success))";

export function MiniChart({
  description,
  headerLabel,
  trend = "flat",
  currentValue = 50,
  medianValue,
  worldClassValue,
  unitSuffix = "",
}: MiniChartProps) {
  const months = generateMonths(18);
  const data = generateSeries(months, trend, currentValue);
  if (medianValue != null) {
    for (const p of data) {
      p.median = Math.max(0, Math.round(medianValue + (Math.random() - 0.5) * 2));
    }
  } else {
    for (const p of data) p.median = currentValue;
  }

  return (
    <div className="w-full" aria-label={description}>
      {headerLabel && (
        <div className="text-xs font-normal text-foreground mb-1 px-1">
          ↑ {headerLabel}
        </div>
      )}
      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 28 }}>
            <XAxis
              dataKey="period"
              angle={-45}
              textAnchor="end"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval={2}
              axisLine={false}
              tickLine={false}
              height={28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={70}
              // Custom tick renders raw <text>, bypassing Recharts' default tick
              // component which auto-wraps long labels (e.g. "6000 units" → "6000\nunits").
              // Per the chart-axis-labels-single-line guideline, ticks must
              // never wrap.
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={10}
                  fill="hsl(var(--muted-foreground))"
                >
                  {payload.value}
                  {unitSuffix}
                </text>
              )}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: 6 }}
              formatter={(v: number) => `${v}${unitSuffix}`}
            />
            {worldClassValue != null && (
              <ReferenceLine
                y={worldClassValue}
                stroke={REFERENCE_GREEN}
                strokeDasharray="4 4"
                label={{
                  value: `World Class: ${worldClassValue}`,
                  // Position INSIDE the chart's top-right so the label fits
                  // within the plot bounds. "right" sits outside in the chart's
                  // right margin, which is only 16px wide and clips the text.
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: REFERENCE_GREEN,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="current"
              name="Current"
              stroke={CURRENT_BLUE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="median"
              name="Median"
              stroke={MEDIAN_BLUE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-end gap-4 px-2 -mt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: CURRENT_BLUE }} />
          Current
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: MEDIAN_BLUE }} />
          Median
        </span>
      </div>
    </div>
  );
}
