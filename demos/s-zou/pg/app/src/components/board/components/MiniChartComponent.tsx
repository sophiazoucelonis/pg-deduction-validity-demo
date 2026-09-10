/**
 * MiniChartComponent — board-component wrapper around the existing recharts
 * `MiniChart` primitive. Passes spec fields through verbatim so the chart
 * primitive remains the single source of synthetic-trendline behavior.
 */

import type { MiniChartSpec } from "@/types/screen-instance";
import { MiniChart } from "@/components/control-tower/MiniChart";

export interface MiniChartComponentProps {
  spec: MiniChartSpec;
}

export function MiniChartComponent({ spec }: MiniChartComponentProps) {
  return (
    <MiniChart
      description={spec.description ?? spec.header_label}
      headerLabel={spec.header_label}
      trend={spec.trend}
      currentValue={spec.current_value}
      medianValue={spec.median_value}
      worldClassValue={spec.world_class_value}
      unitSuffix={spec.unit_suffix}
    />
  );
}
