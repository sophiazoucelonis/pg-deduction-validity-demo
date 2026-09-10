/**
 * ProcessExplorerComponent — board-component wrapper that adapts a typed
 * `process-explorer` spec into props the underlying ProcessExplorer renderer
 * (the subway-map visualization with deviation sliders, lane selector, etc.)
 * was already designed around.
 *
 * The wrapper is intentionally thin — registration shape, no logic — so the
 * heavy renderer stays a self-contained component that's straightforward to
 * test or relocate.
 */

import type { ProcessExplorerSpec } from "@/types/screen-instance";
import { ProcessExplorer } from "@/components/process-explorer/ProcessExplorer";

export interface ProcessExplorerComponentProps {
  spec: ProcessExplorerSpec;
  /** True when rendered inside a column of a multi-column board view; PE
   *  applies a tighter initial zoom + fixed height so cards/text feel
   *  proportional to surrounding page typography. */
  composed?: boolean;
}

export function ProcessExplorerComponent({ spec, composed }: ProcessExplorerComponentProps) {
  // Strip the `kind` discriminator; the renderer doesn't need it.
  const { kind: _kind, ...data } = spec;
  return <ProcessExplorer data={data} composed={composed} />;
}
