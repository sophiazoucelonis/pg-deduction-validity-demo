/**
 * Hero — Control Tower hero section.
 *
 * Horizontal single-card layout:
 *   - Customer logo top-left, scaled up to roughly the visual height of a KPI
 *     block (label + value).
 *   - top_metrics inline on the top-right.
 *
 * The view name is intentionally absent — already shown in the breadcrumb and
 * the page tab title above the hero. Falls back gracefully when `data.brand`
 * is absent (logo block is skipped).
 */

import type { Brand, TopMetric } from "@/types/screen-instance";

export interface HeroProps {
  topMetrics: TopMetric[];
  brand?: Brand;
}

export function Hero({ topMetrics, brand }: HeroProps) {
  return (
    <div className="px-6 pt-6">
      <div className="rounded-2xl border border-[#d3d3dd] bg-card px-8 py-6 flex flex-row items-start justify-between gap-8">
        {brand?.logo_svg && (
          <span
            aria-label={brand.name}
            className="text-foreground flex-shrink-0 [&>svg]:h-11 [&>svg]:w-auto"
            dangerouslySetInnerHTML={{ __html: brand.logo_svg }}
          />
        )}
        <div className="flex flex-wrap items-end justify-end gap-x-10 gap-y-4">
          {topMetrics.map((m) => (
            <div key={m.name} className="flex flex-col">
              <span className="text-[13px] leading-tight font-normal text-muted-foreground">
                {m.name}
              </span>
              <span className="text-[28px] leading-[1.05] font-normal text-foreground tracking-tight">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
