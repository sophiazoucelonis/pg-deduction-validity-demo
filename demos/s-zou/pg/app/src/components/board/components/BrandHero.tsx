/**
 * BrandHero — customer logo + top metrics. Two orientations:
 *
 *   - horizontal (default): full-width hero strip; logo top-left, metrics
 *     inline top-right. Used as the top-of-view hero on Control Tower-style
 *     screens.
 *   - vertical: narrow brand column. Single white card. Logo + (optional)
 *     view title stacked centered at the top, then KPI rows stacked with a
 *     small label and a large value. Matches the canonical Celonis brand
 *     column pattern (logo image + display-2 KPI values, no internal
 *     dividers).
 *
 * KPI typography (vertical mode): label ~14px muted, value ~48px regular
 * dark — sized down from the canonical 56–64px to fit four KPIs in the
 * column without overflow.
 *
 * Logo source: `brand.logo_url` (preferred — public PNG/SVG URL) falls back
 * to `brand.logo_svg` (inline markup) when no URL is provided.
 */

import type { BrandHeroSpec, Brand } from "@/types/screen-instance";

export interface BrandHeroProps {
  spec: BrandHeroSpec;
  brand?: Brand;
}

export function BrandHero({ spec, brand }: BrandHeroProps) {
  const topMetrics = spec.top_metrics ?? [];
  const hasLogoUrl = !!(brand?.logo_url && brand.logo_url.length > 0);
  const hasLogoSvg = !!(brand?.logo_svg && brand.logo_svg.length > 0);
  const hasLogo = hasLogoUrl || hasLogoSvg;
  if (!hasLogo && topMetrics.length === 0 && !spec.title) return null;

  const vertical = spec.orientation === "vertical";

  if (vertical) {
    return (
      <div className="rounded-xl border border-[#d3d3dd] bg-card flex flex-col h-full overflow-hidden">
        {(hasLogo || spec.title) && (
          // Generous bottom padding even when there's no title — the canonical
          // brand column reserves a substantial vertical band above the KPIs
          // (logo + optional title + breathing room). Drop it and the logo
          // sits cramped against the first KPI.
          <div className="flex flex-col items-center gap-5 px-6 pt-12 pb-16 flex-shrink-0">
            {hasLogoUrl ? (
              <img
                src={brand!.logo_url}
                alt={brand?.name ?? ""}
                className="h-14 w-auto max-w-full object-contain"
              />
            ) : hasLogoSvg ? (
              <span
                aria-label={brand?.name}
                className="text-foreground [&>svg]:h-14 [&>svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: brand!.logo_svg! }}
              />
            ) : null}
            {spec.title && (
              <h2 className="text-[26px] font-bold tracking-tight text-foreground text-center leading-tight">
                {spec.title}
              </h2>
            )}
          </div>
        )}
        {topMetrics.length > 0 && (
          <div className="flex flex-col gap-8 px-6 pt-8 pb-6 flex-1 min-h-0 overflow-y-auto">
            {topMetrics.map((m) => (
              <div key={m.name} className="flex flex-col gap-1 min-w-0">
                <span className="text-[14px] leading-tight font-normal text-muted-foreground truncate">
                  {m.name}
                </span>
                <span
                  title={m.value}
                  className="text-[48px] font-normal text-foreground tracking-tight leading-[1.05] truncate"
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#d3d3dd] bg-card flex flex-row items-start justify-between gap-8 px-8 py-6">
      {hasLogoUrl ? (
        <img
          src={brand!.logo_url}
          alt={brand?.name ?? ""}
          className="h-11 w-auto object-contain flex-shrink-0"
        />
      ) : hasLogoSvg ? (
        <span
          aria-label={brand?.name}
          className="text-foreground flex-shrink-0 [&>svg]:h-11 [&>svg]:w-auto"
          dangerouslySetInnerHTML={{ __html: brand!.logo_svg! }}
        />
      ) : null}
      {topMetrics.length > 0 && (
        <div className="flex flex-wrap items-end justify-end gap-x-10 gap-y-4 min-w-0">
          {topMetrics.map((m) => (
            <div key={m.name} className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[13px] leading-tight font-normal text-muted-foreground truncate">
                {m.name}
              </span>
              <span
                title={m.value}
                className="text-[28px] font-normal text-foreground tracking-tight leading-[1.05] truncate"
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
