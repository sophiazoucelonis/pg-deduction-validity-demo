/**
 * ComponentBoundary — the demo-prototype's render safety net.
 *
 * A single component that throws (e.g. an old YAML shape that a migration
 * didn't cover, or a genuinely fragile field access) must NOT white-screen the
 * whole demo. This boundary degrades the failure to a small error card so the
 * rest of the screen — and the sidebar / nav — keep rendering.
 *
 * Two usages (see the approved Phase 3 plan, Workstream D):
 *  - per-tile: wraps each component centrally in `renderComponent` (default
 *    compact fallback).
 *  - per-screen outer net: wraps the BoardView in BoardPage (custom `fallback`)
 *    so a throw OUTSIDE a tile (layout-level) still degrades to a screen card.
 *
 * Error boundaries must be class components — there is no hook equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Identifies what failed — e.g. the component kind or `screen:<id>`.
   *  Logged to the console and (for the tile fallback) shown in the card. */
  label?: string;
  /** Override the default compact tile fallback — used for the screen net. */
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ComponentBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for the presenter / maintainer; never rethrow.
    console.error(
      `[ComponentBoundary] ${this.props.label ?? "component"} failed to render:`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-muted-foreground">
          This component couldn’t be rendered
          {this.props.label ? (
            <>
              {" "}
              (<code className="text-xs">{this.props.label}</code>)
            </>
          ) : null}
          .
        </div>
      );
    }
    return this.props.children;
  }
}
