/**
 * InsightCardList — Celonis Opportunity Explorer-style sidebar. Renders the
 * panel title + a short intro line + one card per opportunity. Each card is
 * a Tile (canonical Celonis bordered container, ported from ce-tile) with:
 *
 *   - an "OPPORTUNITY N" muted overline
 *   - a numbered headline
 *   - 1-2 line description (kept terse — the real product's long paragraphs
 *     overflow a sidebar)
 *   - compact Target Metric / Value Metric pair
 *   - an "Explore →" button at the bottom-right (ce-button-secondary)
 *
 * Reuse: <Tile> from components/celonis, ce-button-secondary CSS class from
 * Emotion. No new primitives.
 */

import type { InsightCardListSpec } from "@/types/screen-instance";
import { Tile } from "@/components/celonis/Tile";
import { useNavigate } from "react-router-dom";
import { useDemoBasePath } from "@/lib/demo-paths";
import { ArrowRight } from "lucide-react";

export interface InsightCardListProps {
  spec: InsightCardListSpec;
}

export function InsightCardList({ spec }: InsightCardListProps) {
  const basePath = useDemoBasePath();
  const navigate = useNavigate();

  const onExplore = (route?: string) => {
    if (!route || !basePath) return;
    navigate(`${basePath}/${route}`);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#d3d3dd] bg-card overflow-hidden">
      {(spec.title || spec.intro_message) && (
        <div className="px-5 pt-4 pb-2 flex flex-col gap-2 flex-shrink-0">
          {spec.title && (
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {spec.title}
            </h2>
          )}
          {spec.intro_message && (
            <p className="text-[12px] leading-relaxed text-muted-foreground italic">
              {spec.intro_message}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 pb-5 flex-1 min-h-0 overflow-y-auto">
        {spec.cards.map((card, idx) => {
          const clickable = !!(card.route && basePath);
          return (
            <div key={idx} data-prep-id={`insight-card-${idx + 1}`}>
            <Tile
              header={
                <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-1">
                  Opportunity {idx + 1}
                </div>
              }
              title={
                <span className="text-[14px] font-semibold leading-snug">
                  {card.headline}
                </span>
              }
              footer={
                clickable ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onExplore(card.route)}
                      data-prep-id={`insight-card-${idx + 1}-explore`}
                      className="ce-button-secondary"
                    >
                      Explore
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : undefined
              }
              contentClassName="p-4"
            >
              <div className="flex flex-col gap-2">
                {card.description && (
                  <p className="text-[12.5px] leading-relaxed text-foreground/85">
                    {card.description}
                  </p>
                )}
                {(card.target_metric || card.value_metric) && (
                  <div className="text-[12px] leading-relaxed flex flex-col gap-0.5">
                    {card.target_metric && (
                      <div>
                        <span className="font-semibold text-foreground">Target Metric: </span>
                        <span className="text-muted-foreground">{card.target_metric}</span>
                      </div>
                    )}
                    {card.value_metric && (
                      <div>
                        <span className="font-semibold text-foreground">Value Metric: </span>
                        <span className="text-muted-foreground">{card.value_metric}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Tile>
            </div>
          );
        })}
      </div>
    </div>
  );
}
