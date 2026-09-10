import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconSidebar } from "./IconSidebar";
import { PackageSidebar } from "./PackageSidebar";
import { TreeNav, MiniTreeNav, TreeNode } from "./TreeNav";
import { usePrepMode } from "@/contexts/PrepModeContext";
import { TalktrackPanel } from "@/components/prep/TalktrackPanel";
import { PrepToggle } from "@/components/prep/PrepToggle";
import {
  Search,
  ChevronRight,
  PanelLeft,
  Package,
  FolderOpen,
  ChevronDown,
  Star,
  CalendarDays,
  LayoutGrid,
  Clock,
  Settings,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Breadcrumb {
  label: string;
  href?: string;
  type?: "studio" | "space" | "package" | "context-model";
  hasDropdown?: boolean;
}

interface AppLayoutProps {
  children: React.ReactNode;
  treeItems?: TreeNode[];
  activeTreeId?: string;
  onTreeSelect?: (node: TreeNode) => void;
  breadcrumbs?: Breadcrumb[];
  title?: string;
  actions?: React.ReactNode;
  /** When true, the default 0%-presence pill + notification bell on the
   *  right of the page header is suppressed. Used by the orchestration
   *  screen, which renders its own toolbar (Active toggle / Logs / edit)
   *  in the `actions` slot in their place. */
  hideViewIndicators?: boolean;
  /** When true, draws a full-width horizontal divider beneath the page
   *  header. Used by the orchestration screen to mirror real OE Studio's
   *  chrome (title row + divider + canvas). */
  headerBordered?: boolean;
  showTree?: boolean;
  /** Which top-nav (IconSidebar) item should render as active. Defaults to
   *  "apps" — the typical demo-prototype state. The Context Model screen
   *  passes "context-models" so the highlight tracks where the user is. */
  activeNavItem?: string;
  /** When true, the package-asset sidebar is hidden. Used by the Context
   *  Model screen, which is conceptually a top-level nav target rather than
   *  a per-package asset, so showing the package-asset list would mislead. */
  hidePackageSidebar?: boolean;
  /** When true, the asset-viewer drops its rounded top-left corner + L/T
   *  borders, so child content sits flush against the chrome. Used by the
   *  Context Model page where the canvas should bleed to the edge of the
   *  panel instead of being inset inside a rounded card. */
  flushContent?: boolean;
  className?: string;
}

const toolbarItems = [
  { id: "calendar", icon: CalendarDays, label: "Calendar" },
  { id: "grid", icon: LayoutGrid, label: "Grid view" },
  { id: "history", icon: Clock, label: "History" },
];

export function AppLayout({
  children,
  treeItems = [],
  activeTreeId,
  onTreeSelect,
  breadcrumbs = [],
  title,
  actions,
  hideViewIndicators = false,
  headerBordered = false,
  showTree = true,
  activeNavItem = "apps",
  hidePackageSidebar = false,
  flushContent = false,
  className,
}: AppLayoutProps) {
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const hasTreeItems = treeItems.length > 0;
  const { prepMode } = usePrepMode();

  const BreadcrumbNav = () => (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      {isTreeCollapsed && (
        <button
          onClick={() => setIsTreeCollapsed(false)}
          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors mr-1"
          title="Show navigator"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
      )}
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-1.5 min-w-0">
          {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
          <div className="flex items-center gap-1 min-w-0">
            {crumb.type === "studio" && (
              <Settings className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {crumb.type === "space" && (
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {crumb.type === "package" && (
              <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {crumb.type === "context-model" && (
              <i
                className="product-icon icon-product-business-landscape text-muted-foreground flex-shrink-0"
                style={{ fontSize: 14 }}
              />
            )}
            <a
              href={crumb.href}
              className={cn(
                "transition-colors font-normal text-[13px] truncate",
                index === breadcrumbs.length - 1
                  ? "text-foreground max-w-[240px]"
                  : "text-muted-foreground hover:text-foreground max-w-[160px]"
              )}
            >
              {crumb.label}
            </a>
            {crumb.hasDropdown && (
              <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </div>
      ))}
      <Star className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 ml-0.5" />
    </div>
  );

  const RightToolbar = () => (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#d3d3dd] rounded-md">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[13px] text-muted-foreground">Search</span>
        <kbd className="text-[10px] bg-[#f1f0f5] px-1 py-0.5 rounded text-muted-foreground font-medium ml-2">⌘</kbd>
        <span className="text-muted-foreground/50 text-[11px]">/</span>
      </div>
      <div className="w-px h-4 bg-[#d3d3dd] mx-1" />
      {toolbarItems.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <item.icon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ))}
      <div className="w-px h-4 bg-[#d3d3dd] mx-1" />
      <PrepToggle />
    </div>
  );

  const TabActions = () => null;

  const ViewIndicators = () => null;

  // Content header (the page tab strip): title + tab actions on the left,
  // view indicators on the right. Sub-nav icon now lives in the PackageSidebar.
  const ContentHeader = () =>
    title || actions ? (
      <div
        className={cn(
          "flex items-center justify-between pl-4 pr-6 py-3 bg-white flex-shrink-0",
          headerBordered && "border-b border-[#d3d3dd]",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {title && <h1 className="text-2xl font-bold text-foreground truncate tracking-tight">{title}</h1>}
          <TabActions />
        </div>
        <div className="flex items-center gap-3">
          {!hideViewIndicators && <ViewIndicators />}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    ) : null;

  // Asset-viewer JSX: matches `package-layout__content__asset-viewer--new` from
  // the real Celonis page — white background, top + left border, top-left
  // rounded corner. The page tab strip (ContentHeader) lives INSIDE the
  // asset-viewer at the top.
  //
  // Important: this is rendered INLINE in the return statement (not as a
  // sub-component) — defining a function component inside the parent's
  // render gives it a new identity on every render, causing React to
  // unmount and remount the entire children subtree (including
  // RouteContent + BoardView). The fix is to keep AssetViewer purely as
  // JSX with no wrapper component identity.
  const assetViewer = (
    <main className={cn("flex-1 overflow-hidden bg-white", className)}>
      <div
        className={cn(
          "h-full flex flex-col bg-white overflow-hidden",
          flushContent ? "" : "rounded-tl-lg border-l border-t border-[#d3d3dd]",
        )}
      >
        <ContentHeader />
        <div className={cn("flex-1 overflow-auto", flushContent ? "" : "p-2")}>{children}</div>
      </div>
    </main>
  );

  return (
    <div
      className={cn(
        "flex h-screen bg-[#fafafd] overflow-hidden border border-[#d3d3dd] relative",
        prepMode && "pr-[380px]",
      )}
      style={
        prepMode
          ? { boxShadow: "inset 0 2px 0 0 var(--brand-primary, #264aff)" }
          : undefined
      }
    >
      {/* IconSidebar reserves a fixed 56px slot in the flex layout, but the actual
          sidebar is absolutely positioned (z-50) so when it expands on hover it
          pops OVER the content instead of pushing it to the right. */}
      <div className="w-14 flex-shrink-0" />
      <IconSidebar className="absolute top-0 left-0 h-full z-50" activeItem={activeNavItem} />

      {/* Main area with optional resizable tree */}
      {showTree && hasTreeItems ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top breadcrumb bar */}
          <header className="flex items-center justify-between h-9 px-4 bg-[#fafafd] flex-shrink-0">
            <BreadcrumbNav />
            <RightToolbar />
          </header>

          {/* Content area with tree */}
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {isTreeCollapsed ? (
              <MiniTreeNav
                items={treeItems}
                activeId={activeTreeId}
                onSelect={onTreeSelect}
                onExpand={() => setIsTreeCollapsed(false)}
              />
            ) : (
              <>
                <ResizablePanel
                  defaultSize={20}
                  minSize={15}
                  maxSize={35}
                  className="min-w-[200px]"
                >
                  <TreeNav
                    items={treeItems}
                    activeId={activeTreeId}
                    onSelect={onTreeSelect}
                    className="h-full"
                    onCollapse={() => setIsTreeCollapsed(true)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel defaultSize={80}>
              <div className="flex-1 flex h-full min-w-0 overflow-visible">
                {!hidePackageSidebar && <PackageSidebar />}
                {assetViewer}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        // No tree - standard layout
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top breadcrumb bar */}
          <header className="flex items-center justify-between h-9 px-4 bg-[#fafafd] flex-shrink-0">
            <BreadcrumbNav />
            <RightToolbar />
          </header>

          {/* Body row: package-sidebar | asset-viewer (which contains ContentHeader + content) */}
          <div className="flex-1 flex min-h-0 overflow-visible">
            {!hidePackageSidebar && <PackageSidebar />}
            {assetViewer}
          </div>
        </div>
      )}
      <TalktrackPanel />
    </div>
  );
}
