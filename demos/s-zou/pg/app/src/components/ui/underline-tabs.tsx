import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface UnderlineTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function UnderlineTabs({ tabs, activeTab, onTabChange, className }: UnderlineTabsProps) {
  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-prep-id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative pb-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </span>
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(231,100%,50%)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
