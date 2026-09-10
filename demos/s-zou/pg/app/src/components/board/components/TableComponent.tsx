/**
 * TableComponent — generic board-component wrapper around the canonical
 * Celonis TableGrid primitive. Takes an explicit column schema + row data and
 * (optionally) renders a CTA button at the bottom that navigates to a sibling
 * view within the same customer.
 *
 * Generalizes the old `control-tower/LeadingMetricsCard` so any board view —
 * not just Control Tower — can render a table with the same look and CTA
 * affordance.
 */

import type { TableSpec, TableColumnSpec } from "@/types/screen-instance";
import {
  TableGrid,
  TableGridHeader,
  TableGridHeaderCell,
  TableGridBody,
  TableGridRow,
  TableGridCell,
} from "@/components/celonis/TableGrid";
import { Badge, type BadgeVariant } from "@/components/celonis/Badge";
import { ChevronDown, MoreHorizontal, Info, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDemoRoutes } from "@/contexts/DemoDataContext";
import { useDemoBasePath, useDemoPathParams } from "@/lib/demo-paths";
import { cn } from "@/lib/utils";

export interface TableComponentProps {
  spec: TableSpec;
}

/**
 * Pick a badge variant from a row's `<key>_severity` field if present.
 * Falls back to "default" when absent or unrecognized.
 */
function severityVariant(severity: unknown): BadgeVariant {
  if (severity === "high") return "error";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "default";
}

function renderCell(
  column: TableColumnSpec,
  row: Record<string, string>,
  prepId?: string,
) {
  const raw = row[column.key] ?? "";
  if (column.render === "badge") {
    const severity = row[`${column.key}_severity`];
    return (
      <Badge variant={severityVariant(severity)} size="sm">
        {raw}
      </Badge>
    );
  }
  if (column.render === "sparkles-pill") {
    // AI-derived value pill — small sparkles icon + value in a soft tinted
    // chip. Mirrors the canonical Material Allocation app's "Optimization
    // Potential" column where Celonis signals LLM/AI-aggregated values.
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4d6] text-[#7a4f00] px-2.5 py-0.5 text-[12.5px] font-medium">
        <Sparkles className="size-3 text-[#7a4f00]" aria-hidden="true" />
        {raw}
      </span>
    );
  }
  if (column.render === "link") {
    // Blue underlined link affordance for the row-ID column when the table
    // has row-level navigation. The click handler lives on the row, not the
    // span itself.
    return (
      <span
        data-prep-id={prepId}
        className="text-[#264aff] underline underline-offset-2 decoration-[#264aff]/60 hover:decoration-[#264aff]"
      >
        {raw}
      </span>
    );
  }
  return raw;
}

export function TableComponent({ spec }: TableComponentProps) {
  const demoRoutes = useDemoRoutes();
  const { owner, customer } = useDemoPathParams();
  const basePath = useDemoBasePath();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const onCtaClick = () => {
    if (!spec.cta?.route || !basePath) return;
    navigate(`${basePath}/${spec.cta.route}`);
  };

  const rowClickable = !!(spec.row_route_key && basePath);
  const onRowClick = (row: Record<string, string>) => {
    if (!rowClickable) return;
    const target = row[spec.row_route_key!];
    if (!target) return;
    // If the target view declares `display_mode: overlay`, open it as a
    // slide-out panel via a query param on the current URL — no page
    // navigation, the underlying overview stays mounted. Otherwise fall
    // back to a normal route push.
    const targetRoute = demoRoutes.find(
      (r) =>
        r.owner === owner &&
        r.customer === customer &&
        r.component === target,
    );
    if (targetRoute?.data.display_mode === "overlay") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("detail", target);
        return next;
      });
      return;
    }
    navigate(`${basePath}/${target}`);
  };

  return (
    <div className="flex flex-col flex-1 rounded-xl border border-[#d3d3dd] bg-card overflow-hidden">
      {spec.title && (
        <div className="px-5 pt-4 pb-2">
          <h4 className="text-base font-semibold text-foreground tracking-tight">
            {spec.title}
          </h4>
        </div>
      )}

      <div className="flex-1">
        <TableGrid dense={spec.dense} spacious={spec.spacious}>
          <TableGridHeader>
            {spec.columns.map((c, i) => (
              <TableGridHeaderCell key={c.key} align={c.align}>
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {i === 0 && <ChevronDown className="h-3 w-3 opacity-80" />}
                </span>
              </TableGridHeaderCell>
            ))}
            <TableGridHeaderCell align="right" className="w-6">
              <MoreHorizontal className="h-3 w-3 opacity-80 ml-auto" />
            </TableGridHeaderCell>
          </TableGridHeader>
          <TableGridBody>
            {spec.rows.length === 0 ? (
              <TableGridRow>
                <TableGridCell className="text-muted-foreground italic" align="left">
                  —
                </TableGridCell>
                {spec.columns.slice(1).map((c) => (
                  <TableGridCell key={c.key} />
                ))}
                <TableGridCell />
              </TableGridRow>
            ) : (
              spec.rows.map((row, idx) => (
                <TableGridRow
                  key={idx}
                  className={cn(
                    rowClickable && "cursor-pointer hover:bg-[#f7f8fb]",
                  )}
                  onClick={rowClickable ? () => onRowClick(row) : undefined}
                  dataPrepId={
                    spec.row_route_key
                      ? `row-${row[spec.columns[0]?.key ?? spec.row_route_key]}`
                      : undefined
                  }
                >
                  {spec.columns.map((c, colIdx) => {
                    const isFirstLink = colIdx === 0 && c.render === "link" && spec.row_route_key;
                    const prepId = isFirstLink
                      ? `cell-link-${row[c.key]}`
                      : undefined;
                    return (
                      <TableGridCell
                        key={c.key}
                        align={c.align}
                        className={cn(
                          c.render === undefined && (c.muted ? "text-muted-foreground" : "text-foreground"),
                          c.bold && "font-medium",
                        )}
                      >
                        {renderCell(c, row, prepId)}
                      </TableGridCell>
                    );
                  })}
                  <TableGridCell />
                </TableGridRow>
              ))
            )}
          </TableGridBody>
        </TableGrid>
      </div>

      {spec.cta && (
        <div className="border-t border-[#d3d3dd] p-3 bg-card">
          <button
            type="button"
            onClick={onCtaClick}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#264aff] text-white text-sm font-medium hover:bg-[#2140d9] transition-colors"
          >
            <Info className="w-4 h-4" />
            {spec.cta.label}
          </button>
        </div>
      )}
    </div>
  );
}
