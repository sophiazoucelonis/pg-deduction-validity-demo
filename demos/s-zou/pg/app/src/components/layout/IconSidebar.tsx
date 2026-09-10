/**
 * IconSidebar — left vertical navigation matching the real Celonis cloud-header.
 *
 * Uses the real Celonis ProductIcons font (loaded via /fonts/icons.woff2,
 * @font-face declared in index.css). Item set comes from the cloud-header HTML
 * (`ce-cloud-header__app-switcher` + `ce-cloud-header__actions`):
 *   App switcher: Apps (active), Celonis Gallery, More
 *   Actions: Data, Marketplace, Search, Help Center, Avatar
 *
 * "Apps" and "Context Models" are routable: clicking them navigates to a real
 * URL within the current customer's space. Other items are visual-only no-ops
 * (no demo destination yet).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoBasePath, useDemoPathParams } from "@/lib/demo-paths";
import { cn } from "@/lib/utils";
import { usePackageViews, useDemoRoutes } from "@/contexts/DemoDataContext";
import { DemoPicker } from "./DemoPicker";

interface SidebarItem {
  /** ProductIcons font class, e.g. "icon-product-database". Mutually exclusive with svgPath. */
  iconClass?: string;
  /** Inline SVG path data for icons that don't live in the ProductIcons font (e.g. Help). */
  svgPath?: string;
  label: string;
  id: string;
}

// The Help icon in real Celonis is rendered as an inline SVG (not from the icon font).
// Path data lifted verbatim from the cloud-header HTML.
const HELP_SVG_PATH =
  "M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2m0 1.667c-4.595 0-8.333 3.738-8.333 8.333S7.405 20.333 12 20.333s8.333-3.738 8.333-8.333S16.595 3.667 12 3.667M12 15.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-8.75a2.75 2.75 0 0 1 2.75 2.75c0 1.01-.297 1.574-1.051 2.359l-.169.171c-.622.622-.78.886-.78 1.47a.75.75 0 0 1-1.5 0c0-1.01.297-1.574 1.051-2.359l.169-.171c.622-.622.78-.886.78-1.47a1.25 1.25 0 0 0-2.493-.128l-.007.128a.75.75 0 0 1-1.5 0A2.75 2.75 0 0 1 12 6.75";

const topItems: SidebarItem[] = [
  { iconClass: "icon-product-business-views", label: "Apps", id: "apps" },
  { iconClass: "icon-product-business-landscape", label: "Context Models", id: "context-models" },
  { iconClass: "icon-product-demo-gallery", label: "Celonis Gallery", id: "gallery" },
  { iconClass: "icon-overflow-menu-horizontal", label: "More", id: "more" },
];

const bottomItems: SidebarItem[] = [
  { iconClass: "icon-product-database", label: "Data", id: "data" },
  { iconClass: "icon-product-app-store-filled", label: "Marketplace", id: "marketplace" },
  { iconClass: "icon-search", label: "Search", id: "search" },
  { svgPath: HELP_SVG_PATH, label: "Help Center", id: "help" },
];

interface IconSidebarProps {
  activeItem?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

export function IconSidebar({
  activeItem = "apps",
  onItemClick,
  className,
}: IconSidebarProps) {
  const active = activeItem;
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { owner, customer } = useDemoPathParams();
  const basePath = useDemoBasePath();

  const customerViews = usePackageViews(owner, customer);
  const demoRoutes = useDemoRoutes();
  const hasContextModel = !!(owner && customer)
    && demoRoutes.some(
      (r) =>
        r.owner === owner &&
        r.customer === customer &&
        r.component === "context-model",
    );
  const appsTarget =
    basePath && customerViews.length > 0
      ? `${basePath}/${customerViews[0].component}`
      : null;
  const contextModelTarget =
    basePath && hasContextModel ? `${basePath}/context-model` : null;

  const targetForId = (id: string): string | null => {
    if (id === "apps") return appsTarget;
    if (id === "context-models") return contextModelTarget;
    return null;
  };

  const handleClick = (id: string) => {
    onItemClick?.(id);
    const target = targetForId(id);
    if (target) navigate(target);
  };

  const renderItem = ({ iconClass, svgPath, label, id }: SidebarItem) => {
    if (id === "context-models" && !hasContextModel) return null;

    return (
      <button
        key={id}
        onClick={() => handleClick(id)}
        className={cn(
          "flex items-center w-full py-2 rounded-lg transition-all duration-200",
          "text-sidebar-icon hover:bg-sidebar-hover",
          active === id && "bg-sidebar-active",
        )}
        aria-label={label}
      >
        <div className="w-10 flex items-center justify-center flex-shrink-0">
          {iconClass && (
            <i
              className={cn(
                "product-icon product-icon--20",
                iconClass,
                active === id ? "text-sidebar-active-foreground" : "text-sidebar-icon",
              )}
            />
          )}
          {svgPath && (
            <svg
              className={cn(
                "w-5 h-5",
                active === id ? "text-sidebar-active-foreground" : "text-sidebar-icon",
              )}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d={svgPath} />
            </svg>
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap transition-all duration-200",
            isExpanded ? "opacity-100 w-auto ml-2" : "opacity-0 w-0 overflow-hidden",
            active === id ? "text-sidebar-active-foreground" : "text-foreground",
          )}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "flex flex-col bg-[#fafafd] py-3 border-r border-[#d3d3dd] transition-all duration-300 ease-in-out",
        isExpanded ? "w-56 shadow-lg" : "w-14",
        className,
      )}
    >
      {/* Celonis logo */}
      <div className="mb-3 h-10 flex items-center justify-center flex-shrink-0 w-14">
        <div className="w-10 flex items-center justify-center">
          <img alt="Celonis" className="w-8 h-8 flex-shrink-0" src="/celonis-logo.svg" />
        </div>
      </div>

      {/* Top navigation */}
      <nav className="flex flex-col gap-1 px-2">{topItems.map(renderItem)}</nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Demo picker */}
      <div className="px-2 mb-1">
        <DemoPicker expanded={isExpanded} />
      </div>

      {/* Bottom navigation */}
      <nav className="flex flex-col gap-1 px-2">{bottomItems.map(renderItem)}</nav>

      {/* User avatar */}
      <div className="mt-4 px-2 flex items-center">
        <div className="w-10 flex items-center justify-center flex-shrink-0">
          <button className="w-8 h-8 rounded-full bg-sidebar-active flex items-center justify-center text-sidebar-active-foreground text-xs font-semibold flex-shrink-0">
            DT
          </button>
        </div>
        {isExpanded && (
          <div className="flex flex-col ml-2">
            <span className="text-sm font-medium text-foreground">Dominik Trut</span>
            <span className="text-xs text-muted-foreground">Member</span>
          </div>
        )}
      </div>
    </aside>
  );
}
