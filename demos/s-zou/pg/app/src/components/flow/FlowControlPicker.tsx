import { useState } from "react";
import { cn } from "@/lib/utils";
import { Settings, Repeat, ArrowRightLeft, Layers, GitFork, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FlowControlItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  category: string;
}

const flowControlItems: FlowControlItem[] = [
  { id: "repeater", icon: <Repeat className="w-5 h-5" />, title: "Repeater", category: "ACTIONS" },
  { id: "iterator", icon: <ArrowRightLeft className="w-5 h-5" />, title: "Iterator", category: "FEEDERS" },
  { id: "array-aggregator", icon: <Layers className="w-5 h-5" />, title: "Array aggregator", category: "AGGREGATORS" },
  { id: "router", icon: <GitFork className="w-5 h-5" />, title: "Router", subtitle: "Splits the scenario flow into multiple routes.", category: "ROUTERS" },
];

interface FlowControlPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: FlowControlItem) => void;
  className?: string;
}

export function FlowControlPicker({ open, onOpenChange, onSelect, className }: FlowControlPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!open) return null;

  const filteredItems = flowControlItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FlowControlItem[]>);

  const categoryOrder = ["ACTIONS", "FEEDERS", "AGGREGATORS", "ROUTERS", "DIRECTIVES"];

  const handleSelect = (item: FlowControlItem) => {
    onSelect(item);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <div 
      className={cn(
        "absolute z-50 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="relative border-2 border-[#22c55e] rounded-lg m-3 mb-0">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <div className="pt-6 pb-3 text-center">
          <span className="text-[#22c55e] font-medium">Flow Control</span>
        </div>
      </div>

      {/* Items List */}
      <div className="p-3 max-h-[300px] overflow-y-auto space-y-4">
        {categoryOrder.map(category => {
          const items = groupedItems[category];
          if (!items || items.length === 0) return null;
          
          return (
            <div key={category}>
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                {category}
              </span>
              <div className="mt-2 space-y-1">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border-2 border-[#22c55e] flex items-center justify-center text-[#22c55e]">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="p-3 border-t border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}

export type { FlowControlItem };
