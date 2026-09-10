import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Check, Layers } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useDemoRoutes,
  useDemoSources,
  isProductionBlobMode,
} from "@/contexts/DemoDataContext";
import { useDemoPathParams } from "@/lib/demo-paths";
import { SourceManager } from "@/components/layout/SourceManager";
import { cn } from "@/lib/utils";

function slugToLabel(slug: string): string {
  return slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

interface DemoPickerProps {
  expanded: boolean;
}

export function DemoPicker({ expanded }: DemoPickerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    owner: activeOwner,
    customer: activeCustomer,
    component: activeComponent,
  } = useDemoPathParams();
  const demoRoutes = useDemoRoutes();
  const sources = useDemoSources();
  const multiSource = sources.length > 1;

  // In production each session sees only the demo it was deep-linked to
  // (loaded from blob). Cross-demo browsing is intentionally hidden — users
  // arrive via shared URLs.
  if (isProductionBlobMode()) return null;

  const grouped = useMemo(() => {
    // Source → owner/customer → screens
    const map = new Map<
      string,
      Map<string, { component: string; label: string }[]>
    >();
    for (const r of demoRoutes) {
      if (r.data.display_mode === "overlay") continue;
      const sourceKey = r.source || "";
      const demoKey = `${r.owner}/${r.customer}`;
      if (!map.has(sourceKey)) map.set(sourceKey, new Map());
      const sourceMap = map.get(sourceKey)!;
      if (!sourceMap.has(demoKey)) sourceMap.set(demoKey, []);
      sourceMap.get(demoKey)!.push({
        component: r.component,
        label: r.data.title ?? slugToLabel(r.component),
      });
    }
    return map;
  }, [demoRoutes]);

  if (grouped.size === 0) return null;

  const handleSelect = (owner: string, customer: string, component: string) => {
    navigate(`/${owner}/${customer}/${component}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center w-full py-2 rounded-lg transition-all duration-200",
            "text-sidebar-icon hover:bg-sidebar-hover",
            open && "bg-sidebar-hover",
          )}
          aria-label="Switch demo"
        >
          <div className="w-10 flex items-center justify-center flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "text-sm font-medium whitespace-nowrap transition-all duration-200",
              expanded ? "opacity-100 w-auto ml-2" : "opacity-0 w-0 overflow-hidden",
              "text-foreground",
            )}
          >
            Demos
          </span>
          {expanded && (
            <ChevronDown
              className={cn(
                "ml-auto mr-2 h-3 w-3 text-sidebar-icon transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-64 p-0 max-h-[70vh] overflow-y-auto"
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Demo
          </p>
          <SourceManager />
        </div>
        <div className="py-1">
          {[...grouped.entries()].map(([sourceKey, demoMap]) => (
            <div key={sourceKey}>
              {multiSource && sourceKey && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-primary/60 uppercase tracking-widest border-t first:border-t-0">
                  {sourceKey}
                </div>
              )}
              {[...demoMap.entries()].map(([demoKey, views]) => {
                const [demoOwner, demoCustomer] = demoKey.split("/");
                return (
                <div key={demoKey}>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {slugToLabel(demoCustomer)}{" "}
                    <span className="text-[10px] font-normal opacity-60">
                      ({demoOwner})
                    </span>
                  </div>
                  {views.map((v) => {
                    const isActive =
                      demoOwner === activeOwner &&
                      demoCustomer === activeCustomer &&
                      v.component === activeComponent;
                    return (
                      <button
                        key={`${demoKey}/${v.component}`}
                        onClick={() => handleSelect(demoOwner, demoCustomer, v.component)}
                        className={cn(
                          "flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left",
                          "hover:bg-accent transition-colors",
                          isActive && "bg-accent/50 font-medium",
                        )}
                      >
                        <span className="flex-1 truncate">{v.label}</span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
