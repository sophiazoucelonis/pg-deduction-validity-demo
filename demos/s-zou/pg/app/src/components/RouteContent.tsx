/**
 * RouteContent — shows a Celonis loader for a brief perceived-fetch window
 * (default 450ms) then renders its children.
 *
 * Used INSIDE each view's AppLayout, so the chrome (sidebar, breadcrumb,
 * page title strip) renders immediately on route change while the heavier
 * inner content (Control Tower tiles, Process Explorer canvas) waits
 * behind the loader. Mirrors how real Celonis feels: the shell appears
 * instantly with the new context, then the body fills in.
 *
 * Each view re-mounts on route change, so the timer naturally restarts
 * — no need to listen to pathname changes here.
 */

import { useEffect, useState, type ReactNode } from "react";
import { CelonisLoader } from "./CelonisLoader";

interface RouteContentProps {
  children: ReactNode;
  /** Minimum loader visibility, in ms. */
  durationMs?: number;
}

export function RouteContent({ children, durationMs = 450 }: RouteContentProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <CelonisLoader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
