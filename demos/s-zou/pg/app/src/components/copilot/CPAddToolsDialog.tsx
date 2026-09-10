import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, X, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  celonisChatOnly?: boolean;
}

const availableTools: Tool[] = [
  { id: "disambiguate", name: "Disambiguate", description: "Lets Process Copilot ask for clarification when it is unsure which knowledge item to select.", category: "Other" },
  { id: "display_chart", name: "Display Chart", description: "This tool is needed when you want to display a chart component.", category: "Data visualization", celonisChatOnly: true },
  { id: "display_kpi", name: "Display KPI", description: "This tool is needed when you want to display a KPI list component.", category: "Data visualization", celonisChatOnly: true },
  { id: "display_process", name: "Display Process", description: "This tool is needed to display your Process Explorers.", category: "Data visualization", celonisChatOnly: true },
  { id: "display_table", name: "Display Table", description: "This tool is needed when you want to display a table component (such as the one from Views) in answers.", category: "Data visualization", celonisChatOnly: true },
  { id: "get_insights", name: "Get Insights", description: "Used to answer a question like 'How can I improve DPO?' and see Celonis-generated insights.", category: "Other" },
  { id: "get_process_data", name: "Get Process Data", description: "Used for tasks that require you to retrieve the event log for a process.", category: "Other" },
  { id: "load_data", name: "Load Data", description: "Equips the LLM with data access for review and analysis. Ideal for summarizing or retrieving data before processing.", category: "Data retrieval" },
  { id: "python", name: "Python", description: "Used when you want your Process Copilot to do ad-hoc calculations in addition to what is available in the Knowledge Model.", category: "Other" },
  { id: "trigger_action_flow", name: "Trigger Action Flow", description: "Connect your Process Copilot to an existing Action Flow and instruct your Process Copilot when to surface this action to users.", category: "Other" },
];

interface CPAddToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTool?: (toolId: string) => void;
}

export function CPAddToolsDialog({ open, onOpenChange, onAddTool }: CPAddToolsDialogProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = useMemo(() => {
    return availableTools.filter(tool => 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);


  const handleAddTool = () => {
    if (selectedTool) {
      onAddTool?.(selectedTool);
      setSelectedTool(null);
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-card border-l border-border flex flex-col z-50 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Add Tool</h3>
          <p className="text-xs text-muted-foreground mt-1">Select the tool you want to add</p>
        </div>
        <button 
          onClick={() => {
            setSelectedTool(null);
            setSearchQuery("");
            onOpenChange(false);
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tools list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {filteredTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                "p-3 rounded border text-left transition-colors",
                selectedTool === tool.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
            >
              <h4 className="font-semibold text-sm mb-1">{tool.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {tool.description}
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="inline-block px-2 py-0.5 text-xs rounded border border-border bg-muted/30 text-muted-foreground">
                  {tool.category}
                </span>
                {tool.celonisChatOnly && (
                  <span className="inline-block px-2 py-0.5 text-xs rounded border border-border bg-muted/30 text-muted-foreground">
                    Celonis chat use only
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Warning banner */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex items-start gap-2 px-2 py-2 bg-warning/10 border border-warning/30 rounded-md text-sm" style={{color: '#8B6F47'}}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning mt-0.5" />
          <span className="text-xs">Selecting too many tools can negatively impact your accuracy</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        <Button 
          onClick={handleAddTool} 
          disabled={!selectedTool}
          className="w-full"
        >
          Add Tool
        </Button>
        <a href="#" className="text-xs text-primary hover:underline block text-center">
          Learn about Tool configuration
        </a>
      </div>
    </div>
  );
}
