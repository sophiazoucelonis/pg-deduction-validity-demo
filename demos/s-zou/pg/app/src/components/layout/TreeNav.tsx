import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  BarChart3,
  GitBranch,
  Database,
  Sparkles,
  Plus,
  Search,
  ArrowUpDown,
  Filter,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
  Zap,
  Workflow,
  MessageSquare,
  PenTool,
  Share2,
  MoreVertical,
  Home,
  Link,
  Pencil,
  Key,
  Copy,
  Files,
  EyeOff,
  Star,
  GitFork,
  Shield,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TreeNode {
  id: string;
  label: string;
  type: "folder" | "view" | "analysis" | "orchestration" | "knowledge" | "assistant" | "data";
  children?: TreeNode[];
  icon?: React.ElementType;
  badge?: string;
  showHome?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  folder: Folder,
  view: LayoutGrid,
  analysis: BarChart3,
  orchestration: Zap,
  knowledge: Share2,
  assistant: MessageSquare,
  data: Database,
};

interface TreeItemProps {
  node: TreeNode;
  level: number;
  activeId?: string;
  onSelect?: (node: TreeNode) => void;
}

function TreeItem({ node, level, activeId, onSelect }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeId === node.id;
  const Icon = node.icon || typeIcons[node.type] || FileText;

  return (
    <div className="animate-fade-in relative" style={{ animationDelay: `${level * 20}ms` }}>
      <div
        className={cn(
          "group flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer transition-colors text-sm font-normal text-foreground",
          isActive ? "bg-[hsl(217,91%,95%)]" : "hover:bg-secondary/50",
          level > 0 && "ml-2"
        )}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onSelect?.(node);
        }}
      >
        {/* Expand/collapse arrow - only for folders */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* Icon */}
        <Icon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            isActive ? "text-foreground" : "text-muted-foreground",
            node.type === "folder" && "fill-current"
          )}
        />

        {/* Label */}
        <span className="truncate flex-1">{node.label}</span>

        {/* Home icon for first view item */}
        {node.showHome && (
          <Home className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
        )}

        {/* More options dropdown on hover - only for non-folder items */}
        {node.type !== "folder" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem className="gap-2">
                <Link className="w-4 h-4" />
                Public link
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 bg-accent">
                <Pencil className="w-4 h-4" />
                Edit name
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Key className="w-4 h-4" />
                Key
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Copy className="w-4 h-4" />
                Copy to
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Files className="w-4 h-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <Home className="w-4 h-4" />
                Mark as Home
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <EyeOff className="w-4 h-4" />
                Hide
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Star className="w-4 h-4" />
                Star Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <GitFork className="w-4 h-4" />
                Dependencies
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Shield className="w-4 h-4" />
                Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Badge */}
        {node.badge && (
          <span className="badge-deployed text-[10px]">{node.badge}</span>
        )}
      </div>

      {/* Children with curved guiding lines */}
      {hasChildren && isExpanded && (
        <div className="relative ml-2">
          {node.children!.map((child, index) => (
            <div key={child.id} className="relative py-0.5">
              {/* Curved connector using SVG */}
              <svg 
                className="absolute left-[7px] top-0 w-3 h-[18px] text-border"
                viewBox="0 0 12 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M0 0 V8 Q0 12 4 12 H12" />
              </svg>
              {/* Vertical line for subsequent siblings */}
              {index < node.children!.length - 1 && (
                <div className="absolute left-[7px] top-[18px] bottom-0 w-px bg-border" />
              )}
              <TreeItem
                node={child}
                level={level + 1}
                activeId={activeId}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeNavProps {
  items: TreeNode[];
  activeId?: string;
  onSelect?: (node: TreeNode) => void;
  title?: string;
  className?: string;
  onCollapse?: () => void;
}

export function TreeNav({ items, activeId, onSelect, title, className, onCollapse }: TreeNavProps) {
  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
      {/* Header with Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/50 border border-transparent rounded-md focus:outline-none focus:border-accent focus:bg-background transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Expand All"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {["All", "Views", "Action Flow", "Knowledge"].map((tab, i) => (
          <button
            key={tab}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
              i === 0
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            {tab}
            {i === 0 && <span className="ml-1 opacity-70">(26)</span>}
          </button>
        ))}
      </div>

      {/* New asset button */}
      <div className="px-3 py-2">
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
          <Plus className="w-4 h-4" />
          <span>New asset</span>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => (
          <TreeItem
            key={item.id}
            node={item}
            level={0}
            activeId={activeId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Collapse button at bottom */}
      {onCollapse && (
        <div className="border-t border-border p-2">
          <button 
            onClick={onCollapse}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Hide navigator"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Mini collapsed sidebar with icons
interface MiniTreeNavProps {
  items: TreeNode[];
  activeId?: string;
  onSelect?: (node: TreeNode) => void;
  onExpand?: () => void;
  className?: string;
}

export function MiniTreeNav({ items, activeId, onSelect, onExpand, className }: MiniTreeNavProps) {
  // Flatten all children to show icons
  const allItems: TreeNode[] = [];
  items.forEach(item => {
    if (item.children) {
      allItems.push(...item.children);
    }
  });

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border w-14", className)}>
      {/* Add button */}
      <div className="p-2 border-b border-border flex justify-center">
        <button className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Icon list */}
      <div className="flex-1 overflow-y-auto py-2">
        {allItems.map((item) => {
          const Icon = item.icon || typeIcons[item.type] || FileText;
          const isActive = activeId === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelect?.(item)}
              className={cn(
                "w-full p-2 flex justify-center transition-colors",
                isActive 
                  ? "bg-[hsl(217,91%,95%)] text-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Expand button at bottom */}
      {onExpand && (
        <div className="border-t border-border p-2 flex justify-center">
          <button 
            onClick={onExpand}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Show navigator"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
