/**
 * PackageSidebar — secondary vertical nav between the IconSidebar and the
 * asset-viewer. Holds the package's view icons; toggled via a small floating
 * button on its right edge.
 */

import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePackageViews } from "@/contexts/DemoDataContext";
import { useDemoBasePath, useDemoPathParams } from "@/lib/demo-paths";

const SIDEBAR_TOGGLE_PATH =
  "M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m1 2v12h16V6zm4 1v10H6V7z";

export function PackageSidebar() {
  const { owner, customer, component: activeComponent } = useDemoPathParams();
  const basePath = useDemoBasePath();
  const [isExpanded, setIsExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const views = usePackageViews(owner, customer);
  if (views.length === 0) return null;

  // Click anywhere on the sidebar background toggles expanded state. Clicks
  // on links/buttons inside still propagate normally — links navigate, the
  // toggle button toggles — because closest(...) catches them and bails out.
  const onSidebarClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    setIsExpanded((v) => !v);
  };

  return (
    <div
      ref={ref}
      onClick={onSidebarClick}
      className="relative flex flex-col flex-shrink-0 pt-2 gap-0.5 bg-[#fafafd] overflow-visible cursor-pointer"
      style={{
        width: isExpanded ? "265px" : "2.25rem",
        transition: "width 300ms ease-in-out",
      }}
    >
      {views.map((view) => {
        const isActive = view.component === activeComponent;
        return (
          <Link
            key={view.component}
            to={`${basePath}/${view.component}`}
            data-prep-id={`nav-${view.component}`}
            className={
              "flex items-center h-8 mx-1 px-2 gap-2.5 rounded flex-shrink-0 overflow-hidden " +
              (isActive ? "bg-sidebar-active" : "hover:bg-sidebar-hover")
            }
            title={view.label}
          >
            {view.isOrchestration ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                className={
                  "flex-shrink-0 " +
                  (isActive ? "text-sidebar-active-foreground" : "text-sidebar-icon")
                }
              >
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  d="M6.5 2a3.75 3.75 0 0 1 .75 7.425v4.015l3.31 3.31h1.69a.75.75 0 0 1 0 1.5h-1.69l-3.53 3.531a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.061l3.53-3.53V9.425A3.751 3.751 0 0 1 6.5 2M3.81 17.5l2.69 2.69 2.69-2.69-2.69-2.69zm2.69-14a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5M19.19 12.005a.75.75 0 0 1 .645.895l-.024.087-.67 2.013H21a.75.75 0 0 1 .603 1.195l-.073.085-5.5 5.5a.75.75 0 0 1-1.266-.678l.57-2.852H14.25a.75.75 0 0 1-.704-1.01l1.75-4.75.049-.105A.75.75 0 0 1 16 12h3.1zm-3.864 4.745h.924a.75.75 0 0 1 .735.898l-.264 1.32 2.468-2.468H18.1a.75.75 0 0 1-.71-.987l.67-2.013h-1.536z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <i
                className={
                  "ce-font-icon " + view.iconClass +
                  " text-[16px] leading-none flex-shrink-0 " +
                  (isActive ? "text-sidebar-active-foreground" : "text-sidebar-icon")
                }
              />
            )}
            <span
              className="font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
              style={{ fontSize: "0.8125rem", lineHeight: 1.23077 }}
            >
              {view.label}
            </span>
          </Link>
        );
      })}

      {/* Toggle button — 24×24 floating on the right edge, ~5vh from bottom */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="absolute z-10 flex items-center justify-center bg-white border border-[#d3d3dd] text-sidebar-icon hover:text-foreground hover:border-[#b0b0c0] transition-colors"
        style={{ width: 24, height: 24, borderRadius: 4, right: -12, bottom: "5vh" }}
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d={SIDEBAR_TOGGLE_PATH} />
        </svg>
      </button>
    </div>
  );
}
